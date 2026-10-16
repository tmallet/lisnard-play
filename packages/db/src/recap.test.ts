import { afterAll, beforeAll, expect, test } from 'bun:test';
import { eq } from 'drizzle-orm';

import type { Db } from './client';
import { getRecap, listRecapDays } from './read';
import { item, type SummaryRecord } from './schema';
import { createTestDb } from './testing';
import {
  listQuotesToScore,
  recordQuoteScore,
  recordSummary,
  setMedia,
  upsertItem,
  upsertSources,
} from './write';

let db: Db;
let drop: () => Promise<void>;
const summary: SummaryRecord = {
  kind: 'ok',
  text: 'Résumé.',
  points: [],
  model: 'm',
  promptVersion: 4,
  generatedAt: '2026-10-13T20:00:00Z',
  cost: 0,
};

async function publish(platformId: string, sourceId: string, at: string, place?: object) {
  const { id } = await upsertItem(db, {
    sourceId,
    platformId,
    url: `https://example.test/${platformId}`,
    title: `Intervention ${platformId}`,
    description: '',
    publishedAt: new Date(at),
  });
  await db
    .update(item)
    .set({ status: 'published', ...(place ? { place: place as never } : {}) })
    .where(eq(item.id, id));
  await setMedia(db, id, { kind: 'embed', provider: 'youtube', embedUrl: 'https://x' });
  return id;
}

let morning: string;
let evening: string;

beforeAll(async () => {
  ({ db, drop } = await createTestDb());
  await upsertSources(db, [
    { id: 'yt:bfm', kind: 'youtube', name: 'BFMTV', active: true },
    { id: 'yt:dl', kind: 'youtube', name: 'David Lisnard', active: true, official: true },
  ]);
  morning = await publish('a', 'yt:bfm', '2026-10-13T06:30:00Z');
  evening = await publish('b', 'yt:dl', '2026-10-13T18:00:00Z', {
    onSite: true,
    label: 'Nice',
    city: 'Nice',
    lat: 43.7,
    lon: 7.27,
    approximate: false,
  });
  // 23 h 30 à Paris le 13, mais déjà le 14 en UTC : compte pour le 13.
  await publish('c', 'yt:bfm', '2026-10-13T21:30:00Z');
  await publish('d', 'yt:bfm', '2026-10-15T09:00:00Z');
  await recordSummary(db, morning, summary, [
    { text: 'Une phrase d’explication assez longue.', startS: 30, theme: null },
    { text: 'L’État profond, c’est Bercy.', startS: 90, theme: 'economy' },
  ]);
  await recordSummary(db, evening, summary, [
    { text: 'Une autre phrase.', startS: 10, theme: null },
  ]);
});
afterAll(() => drop());

test('citations à noter : les plus récentes d’abord, plus jamais une fois notées', async () => {
  const todo = await listQuotesToScore(db, 1, 10);
  expect(todo.map((q) => q.text)).toEqual([
    'Une autre phrase.',
    'Une phrase d’explication assez longue.',
    'L’État profond, c’est Bercy.',
  ]);
  for (const q of todo) await recordQuoteScore(db, q.id, q.text.includes('Bercy') ? 0.92 : 0.2, 1);
  expect(await listQuotesToScore(db, 1, 10)).toEqual([]);
  // Nouvelle version de la question : tout est renoté.
  expect(await listQuotesToScore(db, 2, 10)).toHaveLength(3);
});

test('récapitulatif du jour : interventions (heure de Paris), médias, lieux, citation la mieux notée', async () => {
  const recap = await getRecap(db, '2026-10-13', '2026-10-13');
  expect(recap.interventions).toHaveLength(3);
  expect(recap.outlets).toEqual([
    { name: 'BFMTV', official: false, count: 2 },
    { name: 'David Lisnard', official: true, count: 1 },
  ]);
  expect(recap.places).toEqual([{ label: 'Nice', lat: 43.7, lon: 7.27, count: 1 }]);
  expect(recap.quote?.text).toBe('L’État profond, c’est Bercy.');
});

test('semaine et jours avec intervention', async () => {
  expect((await getRecap(db, '2026-10-12', '2026-10-18')).interventions).toHaveLength(4);
  expect((await getRecap(db, '2026-10-14', '2026-10-14')).interventions).toEqual([]);
  expect(await listRecapDays(db, 5)).toEqual([
    { day: '2026-10-15', count: 1 },
    { day: '2026-10-13', count: 3 },
  ]);
});
