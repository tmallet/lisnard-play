import { afterAll, beforeAll, expect, test } from 'bun:test';
import { eq } from 'drizzle-orm';

import {
  getAdminItem,
  hideItem,
  listAdminActions,
  listAdminItems,
  requestSummary,
  unhideItem,
} from './admin';
import type { Db } from './client';
import { getPublishedById, getRecap, listPublished, listSitemapEntries, search } from './read';
import { item, type SummaryRecord } from './schema';
import { createTestDb } from './testing';
import {
  listQuotesToScore,
  listSummaryTargets,
  recordSummary,
  setMedia,
  upsertItem,
  upsertSources,
} from './write';

let db: Db;
let drop: () => Promise<void>;
let video: string;
let other: string;
const done: SummaryRecord = {
  kind: 'ok',
  text: 'Résumé de la sectorisation.',
  points: [],
  model: 'm',
  promptVersion: 4,
  generatedAt: '2026-10-13T20:00:00Z',
  cost: 0,
};

async function publish(platformId: string, at: string) {
  const { id } = await upsertItem(db, {
    sourceId: 'yt:bfm',
    platformId,
    url: `https://www.youtube.com/watch?v=${platformId}`,
    title: `Face à Face ${platformId}`,
    description: '',
    publishedAt: new Date(at),
  });
  await db.update(item).set({ status: 'published' }).where(eq(item.id, id));
  await setMedia(db, id, { kind: 'embed', provider: 'youtube', embedUrl: 'https://x' });
  return id;
}

beforeAll(async () => {
  ({ db, drop } = await createTestDb());
  await upsertSources(db, [{ id: 'yt:bfm', kind: 'youtube', name: 'BFMTV', active: true }]);
  video = await publish('a', '2026-10-13T06:30:00Z');
  other = await publish('b', '2026-10-12T06:30:00Z');
  await recordSummary(db, video, done, [
    { text: 'La sectorisation a ghettoïsé l’école.', startS: 60, theme: null },
  ]);
  await recordSummary(db, other, done);
});
afterAll(() => drop());

test('vidéo masquée : invisible partout, journalisée, réaffichable', async () => {
  expect(await hideItem(db, video, 'Hors sujet')).toBe(true);
  expect(await hideItem(db, video, 'deux fois')).toBe(false);
  expect(await getPublishedById(db, video)).toBeNull();
  const feed = await listPublished(db, { status: 'past', limit: 10 });
  expect(feed.items.map((i) => i.id)).toEqual([other]);
  expect((await search(db, 'sectorisation')).quotes).toEqual([]);
  expect((await listSitemapEntries(db)).interventions.map((i) => i.id)).toEqual([other]);
  expect((await getRecap(db, '2026-10-13', '2026-10-13')).interventions).toEqual([]);
  expect((await listSummaryTargets(db, 10, 99)).map((t) => t.id)).toEqual([other]);
  expect(await listQuotesToScore(db, 1, 10)).toEqual([]);
  expect(await getAdminItem(db, video)).toMatchObject({ hiddenReason: 'Hors sujet' });
  // Résumé : le worker ignore les vidéos masquées, aucune demande en suspens.
  expect(await requestSummary(db, video)).toBe(false);

  expect(await unhideItem(db, video)).toBe(true);
  expect(await getPublishedById(db, video)).not.toBeNull();
  const { actions } = await listAdminActions(db);
  // Dates lisibles par JavaScript (ISO 8601 en UTC).
  expect(actions.every((a) => !Number.isNaN(new Date(a.at).getTime()) && a.at.endsWith('Z'))).toBe(
    true,
  );
  expect(actions.map((a) => [a.kind, a.reason])).toEqual([
    ['unhide', null],
    ['hide', 'Hors sujet'],
  ]);
});

test('relance du résumé : prioritaire même à jour, puis levée à l’enregistrement', async () => {
  expect(await listSummaryTargets(db, 10, 4)).toEqual([]);
  expect(await requestSummary(db, other)).toBe(true);
  expect(await getAdminItem(db, other)).toMatchObject({ summary: 'requested' });
  // Une autre vidéo à résumer (nouvelle version) : la demande passe d'abord.
  const targets = await listSummaryTargets(db, 10, 5);
  expect(targets[0]?.id).toBe(other);
  await recordSummary(db, other, { ...done, promptVersion: 5 });
  expect(await getAdminItem(db, other)).toMatchObject({ summary: 'ok', summaryRequestedAt: null });
});

test('liste du backoffice : filtres, recherche, états du résumé', async () => {
  await hideItem(db, other, null);
  expect((await listAdminItems(db, { filter: 'hidden' })).items.map((i) => i.id)).toEqual([other]);
  expect((await listAdminItems(db, { filter: 'visible' })).items.map((i) => i.id)).toEqual([video]);
  const found = await listAdminItems(db, { search: 'face à face a' });
  expect(found).toMatchObject({ total: 1 });
  expect(found.items[0]).toMatchObject({
    id: video,
    outlet: 'BFMTV',
    summary: 'ok',
    summarizable: true,
  });
  expect((await listAdminItems(db, { search: '100%' })).total).toBe(0);
});
