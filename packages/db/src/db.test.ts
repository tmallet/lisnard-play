import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import { sql } from 'drizzle-orm';

import type { Db } from './client';
import { getPublishedById, listPublished } from './read';
import { classification, item, type SummaryRecord } from './schema';
import { createTestDb } from './testing';
import {
  addSummarySpend,
  type ClassificationRecord,
  listClassificationTargets,
  listSummaryTargets,
  recordClassification,
  recordSummary,
  recordSummaryFailure,
  resetFailedSummaries,
  setMedia,
  summarySpentOn,
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
    themes: [],
    ...over,
  };
}

/** Publie un contenu comme le ferait le worker : décision, puis rendu média. */
async function publish(itemId: string, over: Partial<ClassificationRecord> = {}) {
  const d = decision(itemId, over);
  await recordClassification(db, d);
  if (d.outcome === 'published')
    await setMedia(db, itemId, {
      kind: 'embed',
      provider: 'youtube',
      embedUrl: 'https://www.youtube.com/embed/x',
    });
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

  test('cible : en attente, puis seulement si l’entrée envoyée au classifieur change', async () => {
    const { id } = await candidate('yt:t1');
    const [target] = await listClassificationTargets(db, 10, 1);
    expect(target?.id).toBe(id);
    await recordClassification(db, decision(id, { inputHash: target?.inputHash ?? '' }));
    expect(await listClassificationTargets(db, 10, 1)).toHaveLength(0);
    // Un changement de statut de diffusion ne modifie pas l’entrée : pas de nouvel appel.
    await candidate('yt:t1', { liveStatus: 'ended' });
    expect(await listClassificationTargets(db, 10, 1)).toHaveLength(0);
    // Ni le démarrage d'un direct (heure de début réelle) : Jev n'étant pas déterministe,
    // un nouveau classement pourrait le dépublier au moment où il commence.
    await candidate('yt:t1', { liveStatus: 'live', startsAt: new Date('2026-05-01T18:02:00Z') });
    expect(await listClassificationTargets(db, 10, 1)).toHaveLength(0);
    // Un nouveau titre, ou une nouvelle version des questions, en fait une cible.
    await candidate('yt:t1', { title: 'Nouveau titre' });
    expect((await listClassificationTargets(db, 10, 1)).map((t) => t.id)).toEqual([id]);
    expect((await listClassificationTargets(db, 10, 2)).map((t) => t.id)).toEqual([id]);
  });
});

describe('lecture publique', () => {
  test('n’expose jamais un contenu en attente ou écarté', async () => {
    const pending = await candidate('yt:p');
    const rejected = await candidate('yt:r');
    const published = await candidate('yt:ok');
    await publish(rejected.id, { outcome: 'rejected', role: 'mairie' });
    await publish(published.id);
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
    for (const c of [live, soon, later, late, old, recent]) await publish(c.id);

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

  test('un contenu publié sans rendu média n’est pas encore visible', async () => {
    const { id } = await candidate('yt:nomedia');
    await recordClassification(db, decision(id));
    expect((await listPublished(db, { status: 'past', limit: 50 })).items).toHaveLength(0);
    expect(await getPublishedById(db, id)).toBeNull();
    await setMedia(db, id, { kind: 'link', og: {} });
    expect(await getPublishedById(db, id)).not.toBeNull();
  });

  test('filtre par thème, multi-thème et sans thème', async () => {
    const eco = await candidate('yt:eco');
    const both = await candidate('yt:both');
    const none = await candidate('yt:none');
    await publish(eco.id, { themes: ['economy'] });
    await publish(both.id, { themes: ['economy', 'security'] });
    await publish(none.id);
    const security = await listPublished(db, { status: 'past', theme: 'security', limit: 50 });
    expect(security.items.map((i) => [i.id, i.themes])).toEqual([
      [both.id, ['economy', 'security']],
    ]);
    const economy = await listPublished(db, { status: 'past', theme: 'economy', limit: 50 });
    expect(economy.items.map((i) => i.id).sort()).toEqual([eco.id, both.id].sort());
    const all = await listPublished(db, { status: 'past', limit: 50 });
    expect(all.items.find((i) => i.id === none.id)?.themes).toEqual([]);
  });
});

describe('stockage jsonb', () => {
  test('les réponses du classifieur sont des objets jsonb, pas des chaînes', async () => {
    const { id } = await candidate('yt:json');
    await recordClassification(db, decision(id));
    const [row] = (await db.execute(
      sql`select jsonb_typeof(answers) as a, (answers->>'intervient')::float as p from ${classification}`,
    )) as unknown as { a: string; p: number }[];
    expect(row).toEqual({ a: 'object', p: 0.9 });
  });
});

describe('résumés', () => {
  const ok = (over: Partial<SummaryRecord> = {}): SummaryRecord =>
    ({
      kind: 'ok',
      text: 'Il estime que…',
      points: ['école'],
      model: 'google/gemini-3.5-flash-lite',
      promptVersion: 1,
      generatedAt: new Date().toISOString(),
      cost: 0.01,
      ...over,
    }) as SummaryRecord;

  test('cibles : vidéos YouTube publiées et terminées, sans résumé de la version courante', async () => {
    const video = await candidate('yt:video');
    const live = await candidate('yt:live', { liveStatus: 'live' });
    const article = await candidate('rss:article');
    const done = await candidate('yt:done');
    for (const c of [video, live, done]) await publish(c.id);
    await recordClassification(db, decision(article.id));
    await setMedia(db, article.id, { kind: 'link', og: {} });
    await recordSummary(db, done.id, ok());
    expect((await listSummaryTargets(db, 10, 1)).map((t) => t.id)).toEqual([video.id]);
    // Nouvelle version de la consigne : le résumé existant est à régénérer.
    expect((await listSummaryTargets(db, 10, 2)).map((t) => t.id).sort()).toEqual(
      [video.id, done.id].sort(),
    );
  });

  test('échecs : abandon au plafond, pour la version courante seulement', async () => {
    const { id } = await candidate('yt:fail');
    await publish(id);
    const abandoned = ok({ kind: 'none', reason: 'failed', cost: 0 } as Partial<SummaryRecord>);
    // Échec avec attente : la vidéo n'est plus proposée avant l'échéance.
    expect(await recordSummaryFailure(db, id, 3, abandoned, 60_000)).toEqual({ abandoned: false });
    expect(await listSummaryTargets(db, 10, 1)).toHaveLength(0);
    expect(await recordSummaryFailure(db, id, 3, abandoned)).toEqual({ abandoned: false });
    expect(await recordSummaryFailure(db, id, 3, abandoned)).toEqual({ abandoned: true });
    expect(await listSummaryTargets(db, 10, 1)).toHaveLength(0);
    expect(await listSummaryTargets(db, 10, 2)).toHaveLength(1);
    expect(await resetFailedSummaries(db)).toBe(1);
    expect(await listSummaryTargets(db, 10, 1)).toHaveLength(1);
  });

  test('dépense du jour et résumé public', async () => {
    const a = await candidate('yt:a');
    const b = await candidate('yt:b');
    await publish(a.id);
    await publish(b.id);
    await recordSummary(db, a.id, ok({ cost: 0.25 }));
    await recordSummary(
      db,
      b.id,
      ok({ kind: 'none', reason: 'not_speaking', cost: 0.5 } as Partial<SummaryRecord>),
    );
    // La dépense est tenue à part : elle s'additionne, même si un résumé est remplacé.
    await addSummarySpend(db, '2026-10-14', 0.25);
    await addSummarySpend(db, '2026-10-14', 0.5);
    await addSummarySpend(db, '2026-10-15', 0.1);
    expect(await summarySpentOn(db, '2026-10-14')).toBeCloseTo(0.75);
    expect(await summarySpentOn(db, '2026-10-13')).toBe(0);
    expect((await getPublishedById(db, a.id))?.summary).toEqual({
      text: 'Il estime que…',
      points: ['école'],
    });
    expect((await getPublishedById(db, b.id))?.summary).toBeNull();
  });

  test('la durée de la vidéo est conservée si une collecte ne la fournit pas', async () => {
    await candidate('yt:dur', { durationS: 600 });
    await candidate('yt:dur');
    const [row] = await db.select().from(item);
    expect(row?.durationS).toBe(600);
  });
});

describe('image des cartes', () => {
  test('article sans miniature : image Open Graph de l’éditeur', async () => {
    const { id } = await candidate('rss:img');
    await recordClassification(db, decision(id));
    await setMedia(db, id, { kind: 'link', og: { image: 'https://static.lejdd.fr/a.jpeg' } });
    const { items } = await listPublished(db, { status: 'past', limit: 50 });
    expect(items[0]?.thumbnailUrl).toBe('https://static.lejdd.fr/a.jpeg');
  });
});
