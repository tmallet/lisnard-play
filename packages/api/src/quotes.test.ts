import { afterAll, beforeAll, expect, test } from 'bun:test';

import type { Db } from '@lisnard/db/client';
import { item } from '@lisnard/db/schema';
import { createTestDb } from '@lisnard/db/testing';
import { recordSummary, setMedia, upsertItem, upsertSources } from '@lisnard/db/write';
import type { TRPCError } from '@trpc/server';
import { eq } from 'drizzle-orm';

import { createContext } from './context';
import { createCaller } from './root';

let db: Db;
let drop: () => Promise<void>;
let id: string;
const caller = () => createCaller(createContext({ version: 'test', isDev: true, db }));

beforeAll(async () => {
  ({ db, drop } = await createTestDb());
  await upsertSources(db, [{ id: 'yt:bfm', kind: 'youtube', name: 'BFMTV', active: true }]);
  ({ id } = await upsertItem(db, {
    sourceId: 'yt:bfm',
    platformId: 'yt:face',
    url: 'https://www.youtube.com/watch?v=face',
    title: 'Face à Face',
    description: '',
    publishedAt: new Date('2026-10-13T06:30:00Z'),
  }));
  await db.update(item).set({ status: 'published' }).where(eq(item.id, id));
  await setMedia(db, id, { kind: 'embed', provider: 'youtube', embedUrl: 'https://x' });
  await recordSummary(
    db,
    id,
    {
      kind: 'ok',
      text: 'Résumé.',
      points: [],
      model: 'm',
      promptVersion: 4,
      generatedAt: '',
      cost: 0,
    },
    [{ text: 'L’État profond en France, c’est Bercy.', startS: 754, theme: 'economy' }],
  );
});
afterAll(() => drop());

test('détail : citations exposées ; citation par minutage', async () => {
  expect((await caller().interventions.byId({ id })).quotes).toEqual([
    { text: 'L’État profond en France, c’est Bercy.', startS: 754, theme: 'economy' },
  ]);
  expect((await caller().quotes.at({ id, t: 756 }))?.outlet).toBe('BFMTV');
  expect(await caller().quotes.at({ id, t: 10 })).toBeNull();
});

test('recherche : accents ignorés ; requête trop courte refusée', async () => {
  const r = await caller().search.query({ q: 'Etat profond' });
  expect(r.quotes.map((q) => q.startS)).toEqual([754]);
  const error = await caller()
    .search.query({ q: 'a' })
    .catch((e) => e);
  expect((error as TRPCError).code).toBe('BAD_REQUEST');
});
