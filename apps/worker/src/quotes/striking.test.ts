import { afterAll, beforeAll, expect, test } from 'bun:test';

import type { Db } from '@lisnard/db/client';
import { item, quote } from '@lisnard/db/schema';
import { createTestDb } from '@lisnard/db/testing';
import { recordSummary, setMedia, upsertItem, upsertSources } from '@lisnard/db/write';
import { eq } from 'drizzle-orm';

import { PINNED_MODEL } from '../classifier/systemone';
import {
  createStrikingScorer,
  STRIKING_VERSION,
  type StrikingScorer,
  scorePendingQuotes,
} from './striking';

let db: Db;
let drop: () => Promise<void>;

beforeAll(async () => {
  ({ db, drop } = await createTestDb());
  await upsertSources(db, [{ id: 'yt:bfm', kind: 'youtube', name: 'BFMTV', active: true }]);
  const { id } = await upsertItem(db, {
    sourceId: 'yt:bfm',
    platformId: 'yt:a',
    url: 'https://example.test/a',
    title: 'Face à Face',
    description: '',
    publishedAt: new Date('2026-10-13T06:30:00Z'),
  });
  await db.update(item).set({ status: 'published' }).where(eq(item.id, id));
  await setMedia(db, id, { kind: 'embed', provider: 'youtube', embedUrl: 'https://x' });
  await recordSummary(
    db,
    id,
    {
      kind: 'ok',
      text: 'R.',
      points: [],
      model: 'm',
      promptVersion: 4,
      generatedAt: '2026-10-13T20:00:00Z',
      cost: 0,
    },
    [
      { text: 'L’État profond, c’est Bercy.', startS: 90, theme: null },
      { text: 'Comme je le disais tout à l’heure.', startS: 30, theme: null },
    ],
  );
});
afterAll(() => drop());

test('client : modèle épinglé, une question vrai/faux, citation et titre en contexte', async () => {
  const requests: Record<string, unknown>[] = [];
  const scorer = createStrikingScorer({
    apiKey: 'test',
    fetch: (async (_url: string, init: RequestInit) => {
      requests.push(JSON.parse(String(init.body)));
      return Response.json({
        answers: { marquante: { type: 'noul', noul: 0.87 } },
        usage: { cost: 0.0004 },
      });
    }) as unknown as typeof fetch,
  });
  expect(await scorer.score({ id: 'q', text: 'Bercy.', title: 'Face à Face' })).toEqual({
    striking: 0.87,
    cost: 0.0004,
  });
  expect(requests[0]).toMatchObject({ model: PINNED_MODEL });
  expect(JSON.parse(String(requests[0]?.state))).toEqual({
    citation: 'Bercy.',
    intervention: 'Face à Face',
  });
  expect(Object.keys(requests[0]?.questions as object)).toEqual(['marquante']);
});

test('tâche : note les citations une fois ; au premier échec, le cycle s’arrête', async () => {
  let calls = 0;
  const failing: StrikingScorer = {
    score: async () => {
      calls += 1;
      throw new Error('HTTP 503');
    },
  };
  expect(await scorePendingQuotes(db, failing)).toEqual({ scored: 0, failed: 1, cost: 0 });
  expect(calls).toBe(1);

  const scorer: StrikingScorer = {
    score: async (q) => ({ striking: q.text.includes('Bercy') ? 0.9 : 0.1, cost: 0.001 }),
  };
  expect(await scorePendingQuotes(db, scorer)).toMatchObject({ scored: 2, failed: 0 });
  expect(await scorePendingQuotes(db, scorer)).toEqual({ scored: 0, failed: 0, cost: 0 });
  const rows = await db.select().from(quote);
  expect(rows.every((r) => r.strikingVersion === STRIKING_VERSION)).toBe(true);
  expect(rows.find((r) => r.text.includes('Bercy'))?.striking).toBe(0.9);
});
