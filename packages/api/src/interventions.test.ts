import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import type { Db } from '@lisnard/db/client';
import { createTestDb } from '@lisnard/db/testing';
// Seuls les tests de l'API peuvent importer `write`, pour préparer les données (ADR 0017).
import {
  recordClassification,
  recordSummary,
  setMedia,
  upsertItem,
  upsertSources,
} from '@lisnard/db/write';
import { TRPCError } from '@trpc/server';

import { createContext } from './context';
import { createCaller } from './root';

let db: Db;
let drop: () => Promise<void>;
const ids = new Map<string, string>();
/** Identifiant d'un contenu créé par seed() (échoue si la clé est inconnue). */
function id(key: string): string {
  const value = ids.get(key);
  if (!value) throw new Error(`contenu inconnu : ${key}`);
  return value;
}

async function seed(
  key: string,
  opts: {
    role?: 'national' | 'mairie';
    themes?: ('economy' | 'security' | 'campaign')[];
    outcome?: 'published' | 'rejected';
    liveStatus?: 'live' | 'upcoming' | 'none';
    startsAt?: Date;
    publishedAt: Date;
  },
) {
  const { id } = await upsertItem(db, {
    sourceId: 'yt:bfmtv',
    platformId: `yt:${key}`,
    url: `https://www.youtube.com/watch?v=${key}`,
    title: `Intervention ${key}`,
    description: 'Description',
    publishedAt: opts.publishedAt,
    startsAt: opts.startsAt ?? null,
    liveStatus: opts.liveStatus ?? 'none',
  });
  await recordClassification(db, {
    itemId: id,
    model: 'typesafe/jev-1.13-20260917',
    questionsVersion: 2,
    inputHash: 'h',
    answers: {
      intervient: 0.97,
      role: { choice: opts.role ?? 'national', confidence: 0.99, probabilities: {} },
      kind: { choice: 'tv', confidence: 1, probabilities: {} },
    },
    thresholds: { intervient: 0.75, role: 0.6 },
    outcome: opts.outcome ?? 'published',
    role: opts.role ?? 'national',
    kind: 'tv',
    themes: opts.themes ?? [],
  });
  await setMedia(db, id, {
    kind: 'embed',
    provider: 'youtube',
    embedUrl: `https://www.youtube.com/embed/${key}`,
  });
  ids.set(key, id);
}

const day = (d: number) => new Date(Date.UTC(2026, 5, d, 12));
const future = (h: number) => new Date(Date.now() + h * 3_600_000);

beforeAll(async () => {
  ({ db, drop } = await createTestDb());
  await upsertSources(db, [{ id: 'yt:bfmtv', kind: 'youtube', name: 'BFMTV', active: true }]);
  await seed('live', {
    liveStatus: 'live',
    startsAt: new Date(Date.now() - 600_000),
    publishedAt: day(1),
  });
  await seed('soon', { liveStatus: 'upcoming', startsAt: future(2), publishedAt: day(1) });
  await seed('later', { liveStatus: 'upcoming', startsAt: future(48), publishedAt: day(1) });
  await seed('p1', { publishedAt: day(10) });
  await seed('p2', { publishedAt: day(11), themes: ['economy', 'security'] });
  await seed('p3', { publishedAt: day(12), themes: ['security'] });
  await seed('rejected', { publishedAt: day(13), role: 'mairie', outcome: 'rejected' });
});
afterAll(() => drop());

const caller = () => createCaller(createContext({ version: 'test', isDev: false, db }));

describe('interventions.list', () => {
  test('statut temporel et tri', async () => {
    const c = caller();
    expect((await c.interventions.list({ status: 'live' })).items.map((i) => i.id)).toEqual([
      id('live'),
    ]);
    expect((await c.interventions.list({ status: 'upcoming' })).items.map((i) => i.id)).toEqual([
      id('soon'),
      id('later'),
    ]);
    expect((await c.interventions.list({ status: 'past' })).items.map((i) => i.id)).toEqual([
      id('p3'),
      id('p2'),
      id('p1'),
    ]);
  });

  test('pagination par curseur', async () => {
    const c = caller();
    const first = await c.interventions.list({ status: 'past', limit: 2 });
    expect(first.items.map((i) => i.id)).toEqual([id('p3'), id('p2')]);
    const next = await c.interventions.list({
      status: 'past',
      limit: 2,
      cursor: first.nextCursor ?? '',
    });
    expect(next.items.map((i) => i.id)).toEqual([id('p1')]);
    expect(next.nextCursor).toBeNull();
  });

  test('filtre par thème', async () => {
    const { items } = await caller().interventions.list({ status: 'past', theme: 'security' });
    expect(items.map((i) => [i.id, i.themes])).toEqual([
      [id('p3'), ['security']],
      [id('p2'), ['economy', 'security']],
    ]);
  });

  test('contenu sans thème : présent sans filtre, avec une liste vide', async () => {
    const { items } = await caller().interventions.list({ status: 'past' });
    expect(items.find((i) => i.id === id('p1'))?.themes).toEqual([]);
  });

  test('ancien filtre par rôle : paramètre ignoré (ADR 0020)', async () => {
    const all = await caller().interventions.list({ status: 'past' });
    // @ts-expect-error le filtre par rôle ne fait plus partie du contrat
    const withRole = await caller().interventions.list({ status: 'past', role: 'amf' });
    expect(withRole.items.map((i) => i.id)).toEqual(all.items.map((i) => i.id));
  });

  test('thème inconnu : requête invalide', async () => {
    const error = await caller()
      // @ts-expect-error valeur hors de la liste des thèmes
      .interventions.list({ status: 'past', theme: 'sport' })
      .catch((e) => e);
    expect((error as TRPCError).code).toBe('BAD_REQUEST');
  });

  test('n’expose ni contenu écarté ni donnée interne', async () => {
    const { items } = await caller().interventions.list({ status: 'past', limit: 50 });
    expect(items.map((i) => i.id)).not.toContain(id('rejected'));
    const [first] = items;
    expect(Object.keys(first ?? {}).sort()).toEqual([
      'date',
      'id',
      'kind',
      'outlet',
      'status',
      'themes',
      'thumbnailUrl',
      'title',
    ]);
  });

  test('taille de page invalide : requête invalide', async () => {
    const error = await caller()
      .interventions.list({ status: 'past', limit: 500 })
      .catch((e) => e);
    expect(error).toBeInstanceOf(TRPCError);
    expect((error as TRPCError).code).toBe('BAD_REQUEST');
  });
});

describe('interventions.byId', () => {
  test('détail avec rendu média et URL de la source', async () => {
    const detail = await caller().interventions.byId({ id: id('p1') });
    expect(detail).toMatchObject({
      id: id('p1'),
      outlet: 'BFMTV',
      // Vidéo d'une chaîne de média : sa description YouTube n'est pas exposée.
      description: '',
      url: 'https://www.youtube.com/watch?v=p1',
    });
    expect(detail.media).toEqual({
      kind: 'embed',
      provider: 'youtube',
      embedUrl: 'https://www.youtube.com/embed/p1',
    });
  });

  test('résumé : texte et points seulement, null sans résumé affichable', async () => {
    await recordSummary(db, id('p1'), {
      kind: 'ok',
      text: 'Il estime que…',
      points: ['école'],
      model: 'google/gemini-3.5-flash-lite',
      promptVersion: 1,
      generatedAt: new Date().toISOString(),
      cost: 0.002,
    });
    await recordSummary(db, id('p3'), {
      kind: 'none',
      reason: 'not_speaking',
      model: 'google/gemini-3.5-flash-lite',
      promptVersion: 1,
      generatedAt: new Date().toISOString(),
      cost: 0.002,
    });
    const c = caller();
    expect((await c.interventions.byId({ id: id('p1') })).summary).toEqual({
      text: 'Il estime que…',
      points: ['école'],
    });
    expect((await c.interventions.byId({ id: id('p3') })).summary).toBeNull();
    expect((await c.interventions.byId({ id: id('p2') })).summary).toBeNull();
  });

  test('inconnu, écarté ou identifiant invalide : NOT_FOUND', async () => {
    for (const candidate of [
      id('rejected'),
      '00000000-0000-0000-0000-000000000000',
      'pas-un-uuid',
    ]) {
      const error = await caller()
        .interventions.byId({ id: candidate })
        .catch((e) => e);
      expect((error as TRPCError).code).toBe('NOT_FOUND');
    }
  });

  test('sans base configurée : erreur interne, sans détail', async () => {
    const error = await createCaller(createContext({ version: 't', isDev: false }))
      .interventions.list({ status: 'past' })
      .catch((e) => e);
    expect((error as TRPCError).code).toBe('INTERNAL_SERVER_ERROR');
  });
});
