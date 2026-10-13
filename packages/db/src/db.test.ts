import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import { sql } from 'drizzle-orm';

import type { Db } from './client';
import { getPublishedById, listPublished } from './read';
import { classification, item } from './schema';
import { createTestDb } from './testing';
import {
  type ClassificationRecord,
  listClassificationTargets,
  recordClassification,
  upsertItem,
  upsertSources,
} from './write';

let db: Db;
let drop: () => Promise<void>;

beforeAll(async () => {
  ({ db, drop } = await createTestDb());
  await upsertSources(db, [
    { id: 'yt:bfmtv', kind: 'youtube', name: 'BFMTV', active: true },
    { id: 'yt:cnews', kind: 'youtube', name: 'CNEWS', active: true },
  ]);
});
afterAll(() => drop());
beforeEach(async () => {
  await db.execute(sql`truncate ${classification}, ${item} cascade`);
});

const answers = {
  intervient: 0.9,
  role: { choice: 'national', confidence: 0.95, probabilities: { national: 0.95 } },
  kind: { choice: 'tv', confidence: 0.9, probabilities: { tv: 0.9 } },
};

function decision(itemId: string, over: Partial<ClassificationRecord> = {}): ClassificationRecord {
  return {
    itemId,
    model: 'typesafe/jev-1.13-20260917',
    questionsVersion: 1,
    inputHash: 'h1',
    answers,
    thresholds: { intervient: 0.5, role: 0.6 },
    outcome: 'published',
    role: 'national',
    kind: 'tv',
    ...over,
  };
}

async function candidate(platformId: string, over: Record<string, unknown> = {}) {
  return upsertItem(db, {
    sourceId: 'yt:bfmtv',
    platformId,
    url: `https://www.youtube.com/watch?v=${platformId}`,
    title: `Titre ${platformId}`,
    description: 'Description',
    publishedAt: new Date('2026-05-01T08:00:00Z'),
    ...over,
  });
}

describe('dédoublonnage', () => {
  test('un même platformId ne crée qu’une ligne et met à jour les métadonnées', async () => {
    const first = await candidate('yt:abc');
    const second = await upsertItem(db, {
      sourceId: 'yt:cnews',
      platformId: 'yt:abc',
      url: 'https://www.youtube.com/watch?v=abc',
      title: 'Titre mis à jour',
      description: 'Nouvelle description',
      publishedAt: new Date('2026-06-01T00:00:00Z'),
    });
    expect(first.inserted).toBe(true);
    expect(second.inserted).toBe(false);
    expect(second.id).toBe(first.id);
    const rows = await db.select().from(item);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.title).toBe('Titre mis à jour');
    expect(rows[0]?.sourceId).toBe('yt:bfmtv'); // première source conservée
    expect(rows[0]?.publishedAt.toISOString()).toBe('2026-05-01T08:00:00.000Z');
  });
});

describe('journal des décisions', () => {
  test('chaque classification ajoute une entrée et dénormalise le statut', async () => {
    const { id } = await candidate('yt:j1');
    await recordClassification(db, decision(id, { outcome: 'rejected', role: 'mairie' }));
    await recordClassification(db, decision(id, { inputHash: 'h2' }));
    const entries = await db.select().from(classification);
    expect(entries).toHaveLength(2);
    const [row] = await db.select().from(item);
    expect(row?.status).toBe('published');
    expect(row?.role).toBe('national');
  });

  test('un contenu modifié après sa classification redevient une cible', async () => {
    const { id } = await candidate('yt:t1');
    expect((await listClassificationTargets(db, 10)).map((t) => t.id)).toEqual([id]);
    await recordClassification(db, decision(id));
    expect(await listClassificationTargets(db, 10)).toHaveLength(0);
    await candidate('yt:t1', { title: 'Nouveau titre' });
    const targets = await listClassificationTargets(db, 10);
    expect(targets.map((t) => t.id)).toEqual([id]);
    expect(targets[0]?.lastInputHash).toBe('h1');
  });
});

describe('lecture publique', () => {
  test('n’expose jamais un contenu en attente ou écarté', async () => {
    const pending = await candidate('yt:p');
    const rejected = await candidate('yt:r');
    const published = await candidate('yt:ok');
    await recordClassification(db, decision(rejected.id, { outcome: 'rejected', role: 'mairie' }));
    await recordClassification(db, decision(published.id));
    const { items } = await listPublished(db, { status: 'past', limit: 50 });
    expect(items.map((i) => i.id)).toEqual([published.id]);
    expect(await getPublishedById(db, pending.id)).toBeNull();
    expect(await getPublishedById(db, rejected.id)).toBeNull();
    expect(await getPublishedById(db, 'pas-un-uuid')).toBeNull();
    const detail = await getPublishedById(db, published.id);
    expect(detail?.outlet).toBe('BFMTV');
    expect(detail && 'answers' in detail).toBe(false);
  });

  test('statuts temporels, tri et pagination', async () => {
    const now = new Date('2026-06-15T12:00:00Z');
    const live = await candidate('yt:live', {
      liveStatus: 'live',
      startsAt: new Date('2026-06-15T11:30:00Z'),
    });
    const soon = await candidate('yt:soon', {
      liveStatus: 'upcoming',
      startsAt: new Date('2026-06-15T18:00:00Z'),
    });
    const later = await candidate('yt:later', {
      liveStatus: 'upcoming',
      startsAt: new Date('2026-06-20T18:00:00Z'),
    });
    const late = await candidate('yt:late', {
      liveStatus: 'upcoming',
      startsAt: new Date('2026-06-15T10:00:00Z'),
    });
    const old = await candidate('yt:old', { publishedAt: new Date('2026-04-01T00:00:00Z') });
    const recent = await candidate('yt:recent', { publishedAt: new Date('2026-06-10T00:00:00Z') });
    for (const c of [live, soon, later, late, old, recent])
      await recordClassification(db, decision(c.id));

    const ids = async (status: 'live' | 'upcoming' | 'past') =>
      (await listPublished(db, { status, limit: 50, now })).items.map((i) => i.id);
    expect(await ids('live')).toEqual([live.id]);
    expect(await ids('upcoming')).toEqual([soon.id, later.id]);
    // Un direct programmé dont l'heure est passée sans démarrer retombe dans « passées ».
    expect(await ids('past')).toEqual([late.id, recent.id, old.id]);

    const page1 = await listPublished(db, { status: 'past', limit: 2, now });
    expect(page1.items.map((i) => i.id)).toEqual([late.id, recent.id]);
    expect(page1.nextCursor).not.toBeNull();
    const page2 = await listPublished(db, {
      status: 'past',
      limit: 2,
      now,
      cursor: page1.nextCursor ?? '',
    });
    expect(page2.items.map((i) => i.id)).toEqual([old.id]);
    expect(page2.nextCursor).toBeNull();
  });

  test('filtre par rôle', async () => {
    const nat = await candidate('yt:nat');
    const amf = await candidate('yt:amf');
    await recordClassification(db, decision(nat.id));
    await recordClassification(db, decision(amf.id, { role: 'amf' }));
    const { items } = await listPublished(db, { status: 'past', role: 'amf', limit: 50 });
    expect(items.map((i) => [i.id, i.role])).toEqual([[amf.id, 'amf']]);
  });
});
