import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import { createHmac } from 'node:crypto';
import { resolve } from 'node:path';

import type { Db } from '@lisnard/db/client';
import { type ClassifierAnswers, item } from '@lisnard/db/schema';
import { createTestDb } from '@lisnard/db/testing';
import { listLiveSoon, upsertItem, upsertSources } from '@lisnard/db/write';
import { eq, sql } from 'drizzle-orm';

import { PINNED_MODEL } from '../classifier/systemone';
import type { Classifier } from '../classifier/types';
import { recheckSoon } from '../collect';
import { parseWebSub } from '../config';
import type { SourceContext, YoutubeSourceConfig } from '../sources/types';
import { channelOfTopic, channelTopic, parseNotification } from '../sources/youtube';
import { handleNotification } from './handle';
import { createWebSubHandler, MAX_BODY_BYTES, WEBSUB_PATH } from './server';
import { HUB_URL, subscribeAll } from './subscribe';

const fixture = (name: string) =>
  Bun.file(resolve(import.meta.dir, '..', '__fixtures__', name)).text();

const SECRET = 's'.repeat(40);
const CALLBACK = `https://hooks.example.test${WEBSUB_PATH}`;
const official: YoutubeSourceConfig = {
  id: 'yt:david-lisnard',
  kind: 'youtube',
  name: 'David Lisnard',
  channelId: 'UC2XZY-bjIEmyLZ9MPJQytZg',
  official: true,
  active: true,
};
const isTracked = (id: string) => id === official.channelId;
const sign = (body: string, secret = SECRET) =>
  `sha1=${createHmac('sha1', secret).update(body).digest('hex')}`;

function post(body: string, signature: string | null) {
  return new Request(CALLBACK, {
    method: 'POST',
    body,
    headers: signature ? { 'x-hub-signature': signature } : {},
  });
}

describe('analyse des notifications', () => {
  test('vidéo publiée ou modifiée : identifiants de la vidéo et de la chaîne', async () => {
    expect(parseNotification(await fixture('websub-notification.xml'))).toEqual({
      videos: [{ videoId: 'LiveNow0001', channelId: official.channelId }],
      deleted: [],
    });
  });

  test('entrée supprimée', async () => {
    expect(parseNotification(await fixture('websub-deleted.xml'))).toEqual({
      videos: [],
      deleted: [{ videoId: 'LiveNow0001', channelId: official.channelId }],
    });
  });

  test('sujet : aller-retour, et refus des URL étrangères', () => {
    expect(channelOfTopic(channelTopic('UCabc'))).toBe('UCabc');
    expect(channelOfTopic('https://evil.example/xml/feeds/videos.xml?channel_id=UCabc')).toBeNull();
    expect(channelOfTopic('pas une url')).toBeNull();
  });
});

describe('adresse de rappel', () => {
  const received: unknown[] = [];
  const handler = createWebSubHandler({
    secret: SECRET,
    isTracked,
    onNotification: (n) => received.push(n),
  });
  beforeEach(() => {
    received.length = 0;
  });

  test('vérification : renvoie le défi pour une chaîne suivie, refuse sinon', async () => {
    const verify = (channel: string) =>
      handler(
        new Request(
          `${CALLBACK}?hub.mode=subscribe&hub.challenge=abc123&hub.lease_seconds=432000&hub.topic=${encodeURIComponent(channelTopic(channel))}`,
        ),
      );
    const ok = await verify(official.channelId);
    expect(ok.status).toBe(200);
    expect(await ok.text()).toBe('abc123');
    expect((await verify('UCinconnu')).status).toBe(404);
  });

  test('notification signée : acceptée et transmise', async () => {
    const body = await fixture('websub-notification.xml');
    const res = await handler(post(body, sign(body)));
    expect(res.status).toBe(204);
    expect(received).toHaveLength(1);
  });

  test('signature absente, fausse ou d’un autre secret : refusée sans effet', async () => {
    const body = await fixture('websub-notification.xml');
    for (const signature of [null, 'sha1=deadbeef', sign(body, 'x'.repeat(40)), sign(`${body} `)])
      expect((await handler(post(body, signature))).status).toBe(401);
    expect(received).toHaveLength(0);
  });

  test('chaîne non suivie : acceptée par le protocole, mais sans vidéo transmise', async () => {
    const body = (await fixture('websub-notification.xml')).replaceAll(
      official.channelId,
      'UCinconnu',
    );
    expect((await handler(post(body, sign(body)))).status).toBe(204);
    expect(received).toEqual([{ videos: [], deleted: [] }]);
  });

  test('corps trop gros, autre chemin, autre méthode', async () => {
    const big = 'x'.repeat(MAX_BODY_BYTES + 1);
    expect((await handler(post(big, sign(big)))).status).toBe(413);
    expect((await handler(new Request('https://hooks.example.test/autre'))).status).toBe(404);
    expect((await handler(new Request(CALLBACK, { method: 'PUT' }))).status).toBe(405);
  });
});

describe('configuration', () => {
  test('désactivée sans variables ; incomplète, non https ou secret court : erreur', () => {
    expect(parseWebSub({})).toBeNull();
    expect(parseWebSub({ WEBSUB_CALLBACK_URL: CALLBACK, WEBSUB_SECRET: SECRET })).toEqual({
      callbackUrl: CALLBACK,
      secret: SECRET,
      port: 8080,
    });
    expect(() => parseWebSub({ WEBSUB_CALLBACK_URL: CALLBACK })).toThrow();
    expect(() =>
      parseWebSub({ WEBSUB_CALLBACK_URL: 'http://hooks.example.test/x', WEBSUB_SECRET: SECRET }),
    ).toThrow();
    expect(() => parseWebSub({ WEBSUB_CALLBACK_URL: CALLBACK, WEBSUB_SECRET: 'court' })).toThrow();
  });
});

describe('abonnement', () => {
  test('une requête par chaîne YouTube active, avec sujet, rappel, secret et bail', async () => {
    const calls: { url: string; body: URLSearchParams }[] = [];
    const fakeFetch = (async (url: string, init?: RequestInit) => {
      calls.push({ url, body: init?.body as URLSearchParams });
      return new Response(null, { status: 202 });
    }) as unknown as typeof fetch;
    const inactive = { ...official, id: 'yt:off', channelId: 'UCoff', active: false };
    const result = await subscribeAll(
      [official, inactive],
      { callbackUrl: CALLBACK, secret: SECRET, port: 8080 },
      fakeFetch,
    );
    expect(result).toEqual({ subscribed: 1, failed: [] });
    expect(calls[0]?.url).toBe(HUB_URL);
    const params = Object.fromEntries(calls[0]?.body ?? []);
    expect(params).toMatchObject({
      'hub.mode': 'subscribe',
      'hub.topic': channelTopic(official.channelId),
      'hub.callback': CALLBACK,
      'hub.secret': SECRET,
      'hub.lease_seconds': '432000',
    });
  });
});

describe('voie rapide et surveillance rapprochée', () => {
  let db: Db;
  let drop: () => Promise<void>;
  let videosCalls = 0;

  const NATIONAL: ClassifierAnswers = {
    intervient: 0.95,
    role: { choice: 'national', confidence: 1, probabilities: { national: 1 } },
    kind: { choice: 'meeting', confidence: 1, probabilities: { meeting: 1 } },
    themes: { campaign: 0.9 },
  };
  const classifier: Classifier = {
    model: PINNED_MODEL,
    classify: async () => ({ model: PINNED_MODEL, answers: NATIONAL, cost: 0 }),
  };

  function youtube(videos: unknown[]): SourceContext {
    return {
      youtubeApiKey: 'test',
      quota: { youtubeUnits: 0 },
      fetch: (async (input: string | URL | Request) => {
        const url = String(input);
        if (url.includes('/youtube/v3/videos')) {
          videosCalls += 1;
          return Response.json({ items: videos });
        }
        if (url.startsWith('https://www.youtube.com/oembed'))
          return Response.json({
            type: 'video',
            html: '<iframe src="https://www.youtube.com/embed/LiveNow0001"></iframe>',
          });
        throw new Error(`réseau injoignable : ${url}`);
      }) as typeof fetch,
    };
  }
  const LIVE = {
    id: 'LiveNow0001',
    snippet: {
      title: 'EN DIRECT | Meeting à Lyon',
      description: 'Meeting de campagne.',
      publishedAt: '2026-10-14T17:59:58Z',
      liveBroadcastContent: 'live',
      thumbnails: { high: { url: 'https://i.ytimg.com/vi/LiveNow0001/hqdefault.jpg' } },
    },
    contentDetails: { duration: 'P0D' },
    liveStreamingDetails: { actualStartTime: '2026-10-14T18:00:00Z' },
  };
  const row = async () =>
    (await db.select().from(item).where(eq(item.platformId, 'yt:LiveNow0001')))[0];

  beforeAll(async () => {
    ({ db, drop } = await createTestDb());
    await upsertSources(db, [
      { id: official.id, kind: 'youtube', name: 'David Lisnard', active: true },
    ]);
  });
  afterAll(() => drop());
  beforeEach(async () => {
    videosCalls = 0;
    await db.execute(sql`truncate ${item} cascade`);
  });

  test('direct notifié : enregistré en direct, publié et doté de son lecteur', async () => {
    const ctx = youtube([LIVE]);
    const n = parseNotification(await fixture('websub-notification.xml'));
    const stats = await handleNotification(
      {
        db,
        ctx,
        classifier,
        sources: [official],
        media: { fetch: ctx.fetch, resolve: async () => ['142.250.75.238'] },
      },
      n,
    );
    expect(stats).toMatchObject({
      kept: 1,
      published: 1,
      videos: [{ videoId: 'LiveNow0001', source: official.id, outcome: 'published' }],
    });
    const saved = await row();
    expect(saved?.liveStatus).toBe('live');
    expect(saved?.status).toBe('published');
    expect(saved?.media?.kind).toBe('embed');
    expect(videosCalls).toBe(1);
  });

  test('entrée supprimée : le direct est clos', async () => {
    await handleNotification(
      { db, ctx: youtube([LIVE]), classifier, sources: [official] },
      parseNotification(await fixture('websub-notification.xml')),
    );
    await handleNotification(
      { db, ctx: youtube([]), classifier, sources: [official] },
      parseNotification(await fixture('websub-deleted.xml')),
    );
    expect((await row())?.liveStatus).toBe('ended');
  });

  test('chaîne de média : vidéo hors sujet écartée, puis notification répétée inchangée', async () => {
    const bfm: YoutubeSourceConfig = {
      ...official,
      id: 'yt:bfmtv',
      channelId: 'UCbfm',
      official: false,
    };
    await upsertSources(db, [{ id: bfm.id, kind: 'youtube', name: 'BFMTV', active: true }]);
    const notify = (videos: unknown[]) =>
      handleNotification(
        { db, ctx: youtube(videos), classifier, sources: [official, bfm] },
        { videos: [{ videoId: 'LiveNow0001', channelId: 'UCbfm' }], deleted: [] },
      );
    const offTopic = { ...LIVE, snippet: { ...LIVE.snippet, title: 'Météo', description: '' } };
    expect((await notify([offTopic])).videos[0]?.outcome).toBe('off_topic');
    const about = { ...LIVE, snippet: { ...LIVE.snippet, title: 'David Lisnard invité' } };
    expect((await notify([about])).videos[0]?.outcome).toBe('published');
    expect((await notify([about])).videos[0]?.outcome).toBe('unchanged');
    expect((await notify([])).videos[0]?.outcome).toBe('unavailable');
  });

  test('chaîne non suivie : aucun appel à l’API, rien d’enregistré', async () => {
    await handleNotification(
      { db, ctx: youtube([LIVE]), classifier, sources: [official] },
      { videos: [{ videoId: 'LiveNow0001', channelId: 'UCinconnu' }], deleted: [] },
    );
    expect(videosCalls).toBe(0);
    expect(await row()).toBeUndefined();
  });

  test('surveillance rapprochée : seuls les directs du quart d’heure, aucun appel sinon', async () => {
    const now = Date.now();
    const add = (id: string, startsAt: Date) =>
      upsertItem(db, {
        sourceId: official.id,
        platformId: `yt:${id}`,
        url: `https://www.youtube.com/watch?v=${id}`,
        title: id,
        description: '',
        publishedAt: new Date(now - 86_400_000),
        startsAt,
        liveStatus: 'upcoming',
      });
    await add('Later', new Date(now + 2 * 3_600_000));
    expect(await recheckSoon(db, youtube([]))).toBe(0);
    expect(videosCalls).toBe(0);

    await add('Soon', new Date(now + 5 * 60_000));
    expect((await listLiveSoon(db)).map((p) => p.platformId)).toEqual(['yt:Soon']);
    const started = { id: 'Soon', snippet: { liveBroadcastContent: 'live' } };
    expect(await recheckSoon(db, youtube([started]))).toBe(1);
    const [soon] = await db.select().from(item).where(eq(item.platformId, 'yt:Soon'));
    expect(soon?.liveStatus).toBe('live');
  });
});
