import { afterAll, beforeAll, expect, test } from 'bun:test';
import { eq } from 'drizzle-orm';

import type { Db } from './client';
import { getPublishedById, getQuoteAt, listSitemapEntries, search } from './read';
import { item, type SummaryRecord } from './schema';
import { createTestDb } from './testing';
import { recordSummary, setMedia, upsertItem, upsertSources } from './write';

let db: Db;
let drop: () => Promise<void>;
let id: string;
const summary = (text: string): SummaryRecord => ({
  kind: 'ok',
  text,
  points: [],
  model: 'm',
  promptVersion: 4,
  generatedAt: '2026-10-15T00:00:00Z',
  cost: 0,
});

beforeAll(async () => {
  ({ db, drop } = await createTestDb());
  await upsertSources(db, [{ id: 'yt:bfm', kind: 'youtube', name: 'BFMTV', active: true }]);
  ({ id } = await upsertItem(db, {
    sourceId: 'yt:bfm',
    platformId: 'yt:face',
    url: 'https://www.youtube.com/watch?v=face',
    title: 'Face à Face : David Lisnard',
    description: '',
    publishedAt: new Date('2026-10-13T06:30:00Z'),
  }));
  await db.update(item).set({ status: 'published' }).where(eq(item.id, id));
  await setMedia(db, id, { kind: 'embed', provider: 'youtube', embedUrl: 'https://x' });
  await recordSummary(
    db,
    id,
    summary('Il critique la gestion des retraites et la dépense publique.'),
    [
      { text: 'L’État profond en France, c’est Bercy.', startS: 754, theme: 'economy' },
      { text: 'Il faut plus de policiers sur le terrain.', startS: 120, theme: 'security' },
      { text: 'Doublon au même instant.', startS: 120, theme: null },
    ],
  );
});
afterAll(() => drop());

test('citations : enregistrées avec le résumé, triées par minutage, doublon ignoré', async () => {
  const detail = await getPublishedById(db, id);
  expect(detail?.quotes.map((q) => q.startS)).toEqual([120, 754]);
});

test('citation par minutage, à 5 secondes près', async () => {
  expect((await getQuoteAt(db, id, 752))?.text).toBe('L’État profond en France, c’est Bercy.');
  expect(await getQuoteAt(db, id, 400)).toBeNull();
});

test('recherche : sans accents ni casse ; citations puis interventions', async () => {
  const r = await search(db, 'etat profond');
  expect(r.quotes.map((q) => q.startS)).toEqual([754]);
  expect((await search(db, 'RETRAITES')).interventions.map((i) => i.id)).toEqual([id]);
  expect((await search(db, 'policier')).quotes[0]?.startS).toBe(120);
  expect(await search(db, 'introuvablezzz')).toEqual({ quotes: [], interventions: [] });
});

test('recherche : une phrase publiée dans deux vidéos ne sort qu’une fois', async () => {
  const { id: copy } = await upsertItem(db, {
    sourceId: 'yt:bfm',
    platformId: 'yt:face-copy',
    url: 'https://www.youtube.com/watch?v=face-copy',
    title: 'Face à Face (rediffusion)',
    description: '',
    publishedAt: new Date('2026-10-13T08:00:00Z'),
  });
  await db.update(item).set({ status: 'published' }).where(eq(item.id, copy));
  await setMedia(db, copy, { kind: 'embed', provider: 'youtube', embedUrl: 'https://y' });
  await recordSummary(db, copy, summary('Rediffusion.'), [
    { text: 'L’État profond en France, c’est Bercy !', startS: 770, theme: 'economy' },
  ]);
  expect((await search(db, 'Bercy')).quotes).toHaveLength(1);
  await db.delete(item).where(eq(item.id, copy));
});

test('plan du site : intervention visible et ses citations, datées du résumé', async () => {
  const { id: hidden } = await upsertItem(db, {
    sourceId: 'yt:bfm',
    platformId: 'yt:hidden',
    url: 'https://www.youtube.com/watch?v=hidden',
    title: 'Non publiée',
    description: '',
    publishedAt: new Date('2026-10-14T08:00:00Z'),
  });
  const entries = await listSitemapEntries(db);
  expect(entries.interventions).toEqual([{ id, updated: '2026-10-15' }]);
  expect(entries.quotes.map((q) => [q.itemId, q.startS])).toEqual([
    [id, 120],
    [id, 754],
  ]);
  expect(JSON.stringify(entries)).not.toContain(hidden);
});

test('résumé régénéré sans citation : les anciennes sont effacées', async () => {
  await recordSummary(db, id, summary('Nouveau résumé.'));
  expect((await getPublishedById(db, id))?.quotes).toEqual([]);
});
