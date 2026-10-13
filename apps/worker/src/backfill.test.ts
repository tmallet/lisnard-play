import { afterAll, beforeAll, expect, test } from 'bun:test';

import type { Db } from '@lisnard/db/client';
import { item } from '@lisnard/db/schema';
import { createTestDb } from '@lisnard/db/testing';
import { upsertSources } from '@lisnard/db/write';

import { runBackfill } from './collect';
import type { SourceContext, YoutubeSourceConfig } from './sources/types';

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

const entry = (videoId: string, date: string) => ({
  snippet: {
    title: `Vidéo ${videoId}`,
    description: '',
    thumbnails: { high: { url: `https://i.ytimg.com/vi/${videoId}/hq.jpg` } },
  },
  contentDetails: { videoId, videoPublishedAt: date },
});

// Playlist « uploads » sur deux pages, de la plus récente à la plus ancienne.
const PAGES: Record<string, unknown> = {
  '': {
    items: [entry('v1', '2026-10-12T10:00:00Z'), entry('v2', '2026-08-01T10:00:00Z')],
    nextPageToken: 'P2',
  },
  P2: {
    items: [
      entry('v3', '2026-04-02T10:00:00Z'),
      { contentDetails: { videoId: 'private' } },
      entry('old', '2026-03-15T10:00:00Z'),
    ],
    nextPageToken: 'P3',
  },
};

const requested: string[] = [];
const fakeFetch = (async (input: string | URL | Request) => {
  const url = new URL(String(input));
  requested.push(url.pathname + (url.searchParams.get('pageToken') ?? ''));
  if (url.pathname.endsWith('/playlistItems')) {
    expect(url.searchParams.get('playlistId')).toBe('UU2XZY-bjIEmyLZ9MPJQytZg');
    return Response.json(PAGES[url.searchParams.get('pageToken') ?? ''] ?? { items: [] });
  }
  if (url.pathname.endsWith('/videos'))
    return Response.json({
      items: (url.searchParams.get('id') ?? '').split(',').map((id) => ({
        id,
        snippet: { description: `Description ${id}`, liveBroadcastContent: 'none' },
      })),
    });
  throw new Error(`inattendu : ${url}`);
}) as typeof fetch;

let db: Db;
let drop: () => Promise<void>;
beforeAll(async () => {
  ({ db, drop } = await createTestDb());
  await upsertSources(
    db,
    [official, media].map(({ id, kind, name, active }) => ({ id, kind, name, active })),
  );
});
afterAll(() => drop());

test('rattrape toutes les vidéos de la chaîne officielle depuis le 31 mars, et s’arrête là', async () => {
  const ctx: SourceContext = { fetch: fakeFetch, youtubeApiKey: 'k', quota: { youtubeUnits: 0 } };
  const stats = await runBackfill(db, [official, media], ctx);
  expect(stats).toMatchObject({ sources: 1, failed: [], fetched: 3, inserted: 3 });
  // La page P3 n'est jamais demandée : la vidéo « old » est antérieure à l'historique.
  expect(requested.filter((r) => r.includes('playlistItems'))).toEqual([
    '/youtube/v3/playlistItems',
    '/youtube/v3/playlistItemsP2',
  ]);
  expect(ctx.quota.youtubeUnits).toBe(3); // 2 pages + 1 lot videos.list
  const rows = await db.select().from(item);
  expect(rows.map((r) => r.platformId).sort()).toEqual(['yt:v1', 'yt:v2', 'yt:v3']);
  expect(rows.find((r) => r.platformId === 'yt:v1')?.description).toBe('Description v1');
  // Idempotent : un second passage ne crée rien.
  expect((await runBackfill(db, [official], { ...ctx, quota: { youtubeUnits: 0 } })).inserted).toBe(
    0,
  );
});
