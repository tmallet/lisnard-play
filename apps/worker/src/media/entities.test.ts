import { afterAll, beforeAll, expect, test } from 'bun:test';

import type { Db } from '@lisnard/db/client';
import { item } from '@lisnard/db/schema';
import { createTestDb } from '@lisnard/db/testing';
import { setMedia, upsertItem, upsertSources } from '@lisnard/db/write';
import { eq } from 'drizzle-orm';

import { decodeEntities } from '../text';
import { repairMediaEntities } from './task';

test('entités nommées : accents, guillemets typographiques, casse respectée', () => {
  expect(
    decodeEntities(
      '&ldquo;L&rsquo;&Eacute;tat&rdquo; &agrave; Bercy &eacute;t&eacute; &Ccedil;a &oelig;uvre',
    ),
  ).toBe('“L’État” à Bercy été Ça œuvre');
  expect(decodeEntities('A &amp; B &AMP; C &#233; &#x2019; &inconnu;')).toBe(
    'A & B & C é ’ &inconnu;',
  );
});

let db: Db;
let drop: () => Promise<void>;
beforeAll(async () => {
  ({ db, drop } = await createTestDb());
  await upsertSources(db, [{ id: 'rss:gn', kind: 'rss', name: 'Google News', active: true }]);
});
afterAll(() => drop());

test('réparation des aperçus enregistrés : décodés une fois, sans appel réseau', async () => {
  const { id } = await upsertItem(db, {
    sourceId: 'rss:gn',
    platformId: 'gn:1',
    url: 'https://news.google.com/x',
    title: 'Budget',
    description: '',
    publishedAt: new Date(),
  });
  await db.update(item).set({ status: 'published' }).where(eq(item.id, id));
  await setMedia(db, id, {
    kind: 'link',
    url: 'https://actu.orange.fr/x',
    og: { title: 'L&rsquo;&Eacute;tat', siteName: 'Orange Actualit&eacute;s' },
  });
  expect(await repairMediaEntities(db)).toBe(1);
  const [row] = await db.select({ media: item.media }).from(item).where(eq(item.id, id));
  expect(row?.media).toEqual({
    kind: 'link',
    url: 'https://actu.orange.fr/x',
    og: { title: 'L’État', siteName: 'Orange Actualités' },
  });
  expect(await repairMediaEntities(db)).toBe(0);
});
