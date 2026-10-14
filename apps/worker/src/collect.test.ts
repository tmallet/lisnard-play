import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import { resolve } from 'node:path';

import type { Db } from '@lisnard/db/client';
import { item } from '@lisnard/db/schema';
import { createTestDb } from '@lisnard/db/testing';
import { upsertSources } from '@lisnard/db/write';
import { sql } from 'drizzle-orm';

import { keepCandidate, recheckLive, runCollection } from './collect';
import { HISTORY_START, LEADER_LOCK_KEY } from './config';
import { Scheduler, tryAcquireLeaderLock } from './scheduler';
import { parseRss } from './sources/rss';
import type {
  RssSourceConfig,
  SourceConfig,
  SourceContext,
  YoutubeSourceConfig,
} from './sources/types';
import { parseChannelFeed, toVideoDetails } from './sources/youtube';

const fixture = (name: string) => Bun.file(resolve(import.meta.dir, '__fixtures__', name));

const official: YoutubeSourceConfig = {
  id: 'yt:david-lisnard',
  kind: 'youtube',
  name: 'David Lisnard',
  channelId: 'UC2XZY-bjIEmyLZ9MPJQytZg',
  official: true,
  active: true,
};
const media: YoutubeSourceConfig = {
  id: 'yt:bfmtv',
  kind: 'youtube',
  name: 'BFMTV',
  channelId: 'UCbfm',
  active: true,
};
const news: RssSourceConfig = {
  id: 'rss:google-news',
  kind: 'rss',
  name: 'Google News',
  url: 'https://news.google.com/rss/search?q=x',
  outletFromItem: true,
  active: true,
};

/** fetch factice : renvoie les fixtures selon l'URL, ou une erreur pour les hôtes « en panne ». */
function fakeFetch(overrides: { videos?: unknown; failHost?: string } = {}): typeof fetch {
  return (async (input: string | URL | Request) => {
    const url = String(input);
    if (overrides.failHost && url.includes(overrides.failHost))
      return new Response('boom', { status: 503 });
    if (url.includes('/feeds/videos.xml'))
      return new Response(await fixture('youtube-feed.xml').text());
    if (url.includes('/youtube/v3/videos'))
      return Response.json(overrides.videos ?? (await fixture('videos-list.json').json()));
    if (url.includes('news.google.com'))
      return new Response(await fixture('google-news.xml').text());
    return new Response('not found', { status: 404 });
  }) as typeof fetch;
}

const ctx = (f = fakeFetch()): SourceContext => ({
  fetch: f,
  youtubeApiKey: 'test',
  quota: { youtubeUnits: 0 },
});

describe('analyse des flux', () => {
  test('flux YouTube : entrées, entités décodées, miniature', async () => {
    const entries = parseChannelFeed(await fixture('youtube-feed.xml').text());
    expect(entries).toHaveLength(3);
    expect(entries[1]?.title.startsWith('"Je ne crois pas')).toBe(true);
    expect(entries[0]?.thumbnailUrl).toContain('ytimg.com');
  });

  test('statut de diffusion : none, upcoming, live, ended', () => {
    expect(toVideoDetails({ id: 'a', snippet: { liveBroadcastContent: 'none' } }).liveStatus).toBe(
      'none',
    );
    const upcoming = toVideoDetails({
      id: 'b',
      snippet: { liveBroadcastContent: 'upcoming' },
      liveStreamingDetails: { scheduledStartTime: '2026-10-14T18:00:00Z' },
    });
    expect(upcoming.liveStatus).toBe('upcoming');
    expect(upcoming.startsAt?.toISOString()).toBe('2026-10-14T18:00:00.000Z');
    expect(
      toVideoDetails({
        id: 'c',
        snippet: { liveBroadcastContent: 'live' },
        liveStreamingDetails: { actualStartTime: '2026-10-13T18:00:00Z' },
      }).liveStatus,
    ).toBe('live');
    const ended = toVideoDetails({
      id: 'd',
      snippet: { liveBroadcastContent: 'none' },
      liveStreamingDetails: {
        actualStartTime: '2026-10-13T06:02:00Z',
        actualEndTime: '2026-10-13T06:40:00Z',
      },
    });
    expect(ended.liveStatus).toBe('ended');
    expect(ended.endsAt?.toISOString()).toBe('2026-10-13T06:40:00.000Z');
  });

  test('Google News : média lu dans <source>, suffixe retiré, identifiant stable', async () => {
    const body = await fixture('google-news.xml').text();
    const [first] = await parseRss(body, news);
    const [again] = await parseRss(body, news);
    expect(first?.outlet).toBe('RMC');
    expect(first?.title.endsWith(' - RMC')).toBe(false);
    expect(first?.platformId).toBe(again?.platformId ?? '');
    expect(first?.description).not.toContain('<');
  });
});

describe('pré-filtre et historique', () => {
  const base = {
    platformId: 'x',
    url: 'https://x',
    description: '',
    publishedAt: new Date('2026-06-01T00:00:00Z'),
  };

  test('écarte un contenu de média sans mention de Lisnard', () => {
    expect(keepCandidate(media, { ...base, title: 'Le journal de 13h' })).toBe(false);
    expect(keepCandidate(media, { ...base, title: 'David LISNARD invité' })).toBe(true);
    expect(
      keepCandidate(media, { ...base, title: 'Invité', description: 'avec david lisnàrd' }),
    ).toBe(true);
  });

  test('la chaîne officielle est exemptée du pré-filtre', () => {
    expect(keepCandidate(official, { ...base, title: 'Questions-réponses en direct' })).toBe(true);
  });

  test('écarte un contenu antérieur au 31 mars 2026 (heure de Paris)', () => {
    const before = new Date(HISTORY_START.getTime() - 1);
    expect(keepCandidate(official, { ...base, title: 'x', publishedAt: before })).toBe(false);
    expect(keepCandidate(official, { ...base, title: 'x', publishedAt: HISTORY_START })).toBe(true);
    expect(
      keepCandidate(official, {
        ...base,
        title: 'x',
        publishedAt: new Date('2026-03-30T12:00:00Z'),
      }),
    ).toBe(false);
  });
});

describe('collecte en base', () => {
  let db: Db;
  let url: string;
  let drop: () => Promise<void>;
  const sources: SourceConfig[] = [official, media, news];

  beforeAll(async () => {
    ({ db, url, drop } = await createTestDb());
    await upsertSources(
      db,
      sources.map(({ id, kind, name, active }) => ({ id, kind, name, active })),
    );
  });
  afterAll(() => drop());
  beforeEach(async () => {
    await db.execute(sql`truncate ${item} cascade`);
  });

  test('enregistre, enrichit et dédoublonne entre deux collectes', async () => {
    const first = await runCollection(db, [official, news], ctx());
    expect(first.failed).toEqual([]);
    expect(first.inserted).toBe(6);
    const second = await runCollection(db, [official, news], ctx());
    expect(second.inserted).toBe(0);
    const rows = await db.select().from(item);
    expect(rows).toHaveLength(6);
    const upcoming = rows.find((r) => r.platformId === 'yt:FQbmJzN2qZg');
    expect(upcoming?.liveStatus).toBe('upcoming');
    expect(upcoming?.description).toBe('Direct programmé.');
    const article = rows.find((r) => r.sourceId === 'rss:google-news');
    expect(article?.outlet).not.toBeNull();
  });

  test('une source en panne n’empêche pas les autres', async () => {
    const stats = await runCollection(
      db,
      [news, official],
      ctx(fakeFetch({ failHost: 'news.google.com' })),
    );
    expect(stats.failed).toEqual(['rss:google-news']);
    expect(stats.inserted).toBe(3);
  });

  test('une source inactive n’est pas interrogée', async () => {
    let calls = 0;
    const counting = (async (...args: Parameters<typeof fetch>) => {
      calls += 1;
      return fakeFetch()(...args);
    }) as typeof fetch;
    const stats = await runCollection(db, [{ ...news, active: false }], ctx(counting));
    expect(stats.sources).toBe(0);
    expect(calls).toBe(0);
  });

  test('revérification : un direct programmé passe en direct puis se termine', async () => {
    await runCollection(db, [official], ctx());
    const live = {
      items: [
        {
          id: 'FQbmJzN2qZg',
          snippet: { liveBroadcastContent: 'live' },
          liveStreamingDetails: { actualStartTime: '2026-10-14T18:01:00Z' },
        },
      ],
    };
    await recheckLive(db, ctx(fakeFetch({ videos: live })));
    const [nowLive] = await db
      .select()
      .from(item)
      .where(sql`${item.platformId} = 'yt:FQbmJzN2qZg'`);
    expect(nowLive?.liveStatus).toBe('live');
    const ended = {
      items: [
        {
          id: 'FQbmJzN2qZg',
          snippet: { liveBroadcastContent: 'none' },
          liveStreamingDetails: {
            actualStartTime: '2026-10-14T18:01:00Z',
            actualEndTime: '2026-10-14T19:00:00Z',
          },
        },
      ],
    };
    await recheckLive(db, ctx(fakeFetch({ videos: ended })));
    const [done] = await db.select().from(item).where(sql`${item.platformId} = 'yt:FQbmJzN2qZg'`);
    expect(done?.liveStatus).toBe('ended');
    expect(done?.endsAt?.toISOString()).toBe('2026-10-14T19:00:00.000Z');
  });

  test('revérification : une vidéo disparue clôt le direct ou annule la programmation', async () => {
    await runCollection(db, [official], ctx());
    const live = {
      items: [
        {
          id: 'FQbmJzN2qZg',
          snippet: { liveBroadcastContent: 'live' },
          liveStreamingDetails: { actualStartTime: '2026-10-14T18:01:00Z' },
        },
      ],
    };
    await recheckLive(db, ctx(fakeFetch({ videos: live })));
    // Vidéo supprimée ou passée en privé : absente de la réponse de l'API.
    await recheckLive(db, ctx(fakeFetch({ videos: { items: [] } })));
    const [gone] = await db.select().from(item).where(sql`${item.platformId} = 'yt:FQbmJzN2qZg'`);
    expect(gone?.liveStatus).toBe('ended');
    expect(gone?.endsAt).not.toBeNull();
    // Plus rien à revérifier ensuite.
    expect(await recheckLive(db, ctx(fakeFetch({ videos: { items: [] } })))).toBe(0);
  });

  test('verrou : une seule instance obtient le droit de collecter', async () => {
    const a = await tryAcquireLeaderLock(url, LEADER_LOCK_KEY);
    const b = await tryAcquireLeaderLock(url, LEADER_LOCK_KEY);
    expect(a.acquired).toBe(true);
    expect(b.acquired).toBe(false);
    await a.release();
    const c = await tryAcquireLeaderLock(url, LEADER_LOCK_KEY);
    expect(c.acquired).toBe(true);
    await c.release();
  });
});

describe('planification', () => {
  test('respecte la cadence de chaque tâche et isole les échecs', async () => {
    const runs: string[] = [];
    const scheduler = new Scheduler(
      [
        { name: 'rapide', everyMs: 1000, run: async () => runs.push('rapide') },
        {
          name: 'en-panne',
          everyMs: 1000,
          run: async () => {
            throw new Error('panne');
          },
        },
        { name: 'lente', everyMs: 5000, run: async () => runs.push('lente') },
      ],
      100,
    );
    expect(await scheduler.tick(0)).toEqual(['rapide', 'en-panne', 'lente']);
    expect(await scheduler.tick(500)).toEqual([]);
    expect(await scheduler.tick(1000)).toEqual(['rapide', 'en-panne']);
    expect(runs).toEqual(['rapide', 'lente', 'rapide']);
  });
});
