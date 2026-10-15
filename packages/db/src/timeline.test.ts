import { afterAll, beforeAll, expect, test } from 'bun:test';
import { eq } from 'drizzle-orm';

import type { Db } from './client';
import { listTimelineItems } from './read';
import { item } from './schema';
import { createTestDb } from './testing';
import { setMedia, upsertItem, upsertSources } from './write';

let db: Db;
let drop: () => Promise<void>;
beforeAll(async () => {
  ({ db, drop } = await createTestDb());
  await upsertSources(db, [
    { id: 'yt:dl', kind: 'youtube', name: 'David Lisnard', active: true, official: true },
    { id: 'rss:gn', kind: 'rss', name: 'Google News', active: true },
  ]);
});
afterAll(() => drop());

async function add(id: string, sourceId: string, over: Partial<Parameters<typeof upsertItem>[1]>) {
  const { id: itemId } = await upsertItem(db, {
    sourceId,
    platformId: id,
    url: `https://example.test/${id}`,
    title: id,
    description: '',
    publishedAt: new Date('2026-10-08T10:00:00Z'),
    ...over,
  });
  await db.update(item).set({ status: 'published' }).where(eq(item.id, itemId));
  await setMedia(db, itemId, { kind: 'embed', provider: 'youtube', embedUrl: 'https://x' });
}

test('graphique des adhésions : ordre chronologique, jour de Paris, source officielle, direct', async () => {
  // 23 h 30 UTC le 8 octobre = 1 h 30 le 9 octobre à Paris.
  await add('yt:late', 'yt:dl', { publishedAt: new Date('2026-10-08T23:30:00Z') });
  await add('gn:1', 'rss:gn', { publishedAt: new Date('2026-10-08T09:00:00Z') });
  await add('yt:live', 'yt:dl', {
    publishedAt: new Date('2026-10-07T17:00:00Z'),
    startsAt: new Date('2026-10-07T18:00:00Z'),
    liveStatus: 'ended',
  });
  const rows = await listTimelineItems(db);
  expect(rows.map((r) => [r.title, r.day, r.official, r.live])).toEqual([
    ['yt:live', '2026-10-07', true, true],
    ['gn:1', '2026-10-08', false, false],
    ['yt:late', '2026-10-09', true, false],
  ]);
});

test('détail : description YouTube seulement pour la chaîne officielle', async () => {
  const { getPublishedById } = await import('./read');
  await upsertSources(db, [{ id: 'yt:bfm', kind: 'youtube', name: 'BFMTV', active: true }]);
  const create = async (platformId: string, sourceId: string) => {
    const { id } = await upsertItem(db, {
      sourceId,
      platformId,
      url: `https://www.youtube.com/watch?v=${platformId}`,
      title: platformId,
      description: 'Abonnez-vous, retrouvez nos autres invités…',
      publishedAt: new Date('2026-10-08T10:00:00Z'),
    });
    await db.update(item).set({ status: 'published' }).where(eq(item.id, id));
    await setMedia(db, id, { kind: 'embed', provider: 'youtube', embedUrl: 'https://x' });
    return id;
  };
  const media = await create('yt:media', 'yt:bfm');
  const official = await create('yt:official', 'yt:dl');
  expect((await getPublishedById(db, media))?.description).toBe('');
  expect((await getPublishedById(db, official))?.description).toBe(
    'Abonnez-vous, retrouvez nos autres invités…',
  );
});
