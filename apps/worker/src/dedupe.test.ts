import { afterAll, beforeAll, beforeEach, expect, test } from 'bun:test';

import type { Db } from '@lisnard/db/client';
import { listPublished } from '@lisnard/db/read';
import { item } from '@lisnard/db/schema';
import { createTestDb } from '@lisnard/db/testing';
import { listClassificationTargets, setMedia, upsertItem, upsertSources } from '@lisnard/db/write';
import { eq, sql } from 'drizzle-orm';

import { markPressDuplicates, titleKey } from './dedupe';

let db: Db;
let drop: () => Promise<void>;
beforeAll(async () => {
  ({ db, drop } = await createTestDb());
  await upsertSources(db, [{ id: 'rss:gn', kind: 'rss', name: 'Google News', active: true }]);
});
afterAll(() => drop());
beforeEach(async () => {
  await db.execute(sql`truncate ${item} cascade`);
});

async function article(
  key: string,
  title: string,
  outlet: string,
  publishedAt: string,
  publish = true,
) {
  const { id } = await upsertItem(db, {
    sourceId: 'rss:gn',
    platformId: `rss:${key}`,
    url: `https://news.google.com/${key}`,
    outlet,
    title,
    description: '',
    publishedAt: new Date(publishedAt),
  });
  if (publish) {
    await db.update(item).set({ status: 'published' }).where(eq(item.id, id));
    await setMedia(db, id, { kind: 'link', og: { title } });
  }
  return id;
}

test('clé de titre : accents, casse, guillemets et ponctuation ignorés', () => {
  expect(titleKey('Budget: “L’État profond, c’est Bercy”')).toBe(
    titleKey('Budget : "L\'Etat profond, c\'est Bercy"'),
  );
});

test('reprises d’une même dépêche : une seule reste visible, les autres sont rattachées', async () => {
  const bfm = await article(
    'a',
    'Budget: “L’État profond, c’est Bercy”',
    'BFM',
    '2026-10-13T08:00:00Z',
  );
  await article(
    'b',
    'Budget: “L’État profond, c’est Bercy”',
    'Orange Actualités',
    '2026-10-13T10:00:00Z',
  );
  await article('c', 'Un autre sujet', 'Capital', '2026-10-13T09:00:00Z');
  // Même titre, mais un mois plus tard : ce n'est pas une reprise.
  await article('d', 'Budget: “L’État profond, c’est Bercy”', 'Le Point', '2026-11-20T09:00:00Z');

  expect(await markPressDuplicates(db)).toBe(1);
  const { items } = await listPublished(db, { status: 'past', limit: 50 });
  expect(items.map((i) => i.outlet).sort()).toEqual(['BFM', 'Capital', 'Le Point']);
  expect(items.find((i) => i.outlet === 'BFM')?.id).toBe(bfm);
  // Idempotent.
  expect(await markPressDuplicates(db)).toBe(1);
});

test('titre générique : deux articles distincts restent visibles', async () => {
  await article('a', 'Entretien avec David Lisnard', 'Le Point', '2026-10-13T08:00:00Z');
  await article('b', 'Entretien avec David Lisnard', 'Le Figaro', '2026-10-14T08:00:00Z');
  expect(await markPressDuplicates(db)).toBe(0);
  expect((await listPublished(db, { status: 'past', limit: 50 })).items).toHaveLength(2);
});

test('l’article gardé est de préférence déjà visible ; la reprise n’est pas classée', async () => {
  const pending = await article(
    'a',
    'Le même titre repris par plusieurs médias',
    'Yahoo Finance',
    '2026-10-13T08:00:00Z',
    false,
  );
  const visible = await article(
    'b',
    'Le même titre repris par plusieurs médias',
    'Capital',
    '2026-10-13T09:00:00Z',
  );
  await markPressDuplicates(db);
  const { items } = await listPublished(db, { status: 'past', limit: 50 });
  expect(items.map((i) => i.id)).toEqual([visible]);
  // La reprise en attente n'est pas envoyée au classifieur.
  expect((await listClassificationTargets(db, 50, 1)).map((t) => t.id)).not.toContain(pending);
});
