import { afterAll, beforeAll, expect, test } from 'bun:test';
import type { Db } from '@lisnard/db/client';
import { item } from '@lisnard/db/schema';
import { createTestDb } from '@lisnard/db/testing';
import { setMedia, upsertItem, upsertSources } from '@lisnard/db/write';
import { eq } from 'drizzle-orm';

import { createContext } from './context';
import type { MembershipSource } from './membership/source';
import { createCaller } from './root';
import { addDays, membersOf, mondayOf, periodBounds } from './routers/recap';

let db: Db;
let drop: () => Promise<void>;

const membership: MembershipSource = {
  get: async () => ({
    stale: false,
    data: {
      total: { members: 61792, updatedAt: '2026-10-16T08:00:00Z' },
      history: [
        { day: '2026-10-11', members: 52086 },
        { day: '2026-10-12', members: 53988 },
        { day: '2026-10-13', members: 55943 },
        { day: '2026-10-14', members: 59090 },
        { day: '2026-10-15', members: 61585 },
      ],
    },
  }),
};

const caller = () =>
  createCaller(
    createContext({
      version: 'test',
      isDev: true,
      db,
      membership,
      now: () => new Date('2026-10-16T09:00:00Z'),
    }),
  );

beforeAll(async () => {
  ({ db, drop } = await createTestDb());
  await upsertSources(db, [{ id: 'yt:bfm', kind: 'youtube', name: 'BFMTV', active: true }]);
  for (const [platformId, at] of [
    ['a', '2026-10-13T06:30:00Z'],
    ['b', '2026-10-13T12:00:00Z'],
    ['c', '2026-10-15T12:00:00Z'],
  ] as const) {
    const { id } = await upsertItem(db, {
      sourceId: 'yt:bfm',
      platformId,
      url: `https://example.test/${platformId}`,
      title: platformId,
      description: '',
      publishedAt: new Date(at),
    });
    await db.update(item).set({ status: 'published' }).where(eq(item.id, id));
    await setMedia(db, id, { kind: 'embed', provider: 'youtube', embedUrl: 'https://x' });
  }
});
afterAll(() => drop());

test('périodes : jour valide, semaine désignée par son lundi', () => {
  expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
  expect(mondayOf('2026-10-18')).toBe('2026-10-12');
  expect(periodBounds('day', '2026-10-13')).toEqual({ from: '2026-10-13', to: '2026-10-13' });
  expect(periodBounds('week', '2026-10-12')).toEqual({ from: '2026-10-12', to: '2026-10-18' });
  expect(periodBounds('week', '2026-10-13')).toBeNull();
  expect(periodBounds('day', '2026-02-30')).toBeNull();
  expect(periodBounds('day', 'demain')).toBeNull();
});

test('adhésions : total en fin, hausse depuis la veille, courbe', () => {
  const days = [
    { day: '2026-10-12', members: 100 },
    { day: '2026-10-13', members: 130 },
  ];
  expect(membersOf(days, '2026-10-13', '2026-10-13', '2026-10-12')).toEqual({
    total: 130,
    delta: 30,
    curve: [
      { day: '2026-10-12', members: 100 },
      { day: '2026-10-13', members: 130 },
    ],
  });
  // Veille hors de l'historique : total connu, sans hausse.
  expect(membersOf(days, '2026-10-12', '2026-10-12', '2026-10-12')).toMatchObject({
    total: 100,
    delta: null,
  });
  expect(membersOf(days, '2026-10-01', '2026-10-01', '2026-10-01')).toBeNull();
});

test('récapitulatif du jour : interventions et adhésions ; jour vide : null', async () => {
  const recap = await caller().recap.get({ period: 'day', start: '2026-10-13' });
  expect(recap?.interventions).toHaveLength(2);
  expect(recap?.members).toMatchObject({ total: 55943, delta: 1955 });
  expect(recap?.members?.curve.map((p) => p.day)).toEqual([
    '2026-10-11',
    '2026-10-12',
    '2026-10-13',
  ]);
  expect(await caller().recap.get({ period: 'day', start: '2026-10-14' })).toBeNull();
});

test('semaine en cours : jour en cours au total en direct ; liste des jours et semaines', async () => {
  const week = await caller().recap.get({ period: 'week', start: '2026-10-12' });
  expect(week?.interventions).toHaveLength(3);
  expect(week?.members).toMatchObject({ total: 61792, delta: 61792 - 52086 });
  const list = await caller().recap.list();
  expect(list.days).toEqual([
    { day: '2026-10-15', count: 1, delta: 2495 },
    { day: '2026-10-13', count: 2, delta: 1955 },
  ]);
  expect(list.weeks).toEqual([
    { start: '2026-10-12', end: '2026-10-18', count: 3, delta: 61792 - 52086 },
  ]);
});
