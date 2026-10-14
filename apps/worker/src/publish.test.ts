import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';

import type { Db } from '@lisnard/db/client';
import { type ClassifierAnswers, classification, item } from '@lisnard/db/schema';
import { createTestDb } from '@lisnard/db/testing';
import { upsertItem, upsertSources } from '@lisnard/db/write';
import { eq, sql } from 'drizzle-orm';

import { decide } from './classifier/decide';
import { QUESTIONS_VERSION } from './classifier/questions';
import { createSystemOneClassifier, PINNED_MODEL, parseAnswers } from './classifier/systemone';
import { thresholdsFor } from './classifier/thresholds';
import type { Classifier, ClassifierState } from './classifier/types';
import { classifyPending, reclassify, recompute } from './publish';

/** Réponses nettes (loin des seuils), pour ne pas dépendre des seuils de production. */
const ANSWERS: Record<string, ClassifierAnswers> = {
  national: {
    intervient: 0.95,
    role: { choice: 'national', confidence: 1, probabilities: { national: 1 } },
    kind: { choice: 'tv', confidence: 1, probabilities: { tv: 1 } },
  },
  amf: {
    intervient: 0.9,
    role: { choice: 'amf', confidence: 1, probabilities: { amf: 1 } },
    kind: { choice: 'discours', confidence: 1, probabilities: { discours: 1 } },
  },
  mairie: {
    intervient: 0.9,
    role: { choice: 'mairie', confidence: 1, probabilities: { mairie: 1 } },
    kind: { choice: 'presse', confidence: 1, probabilities: { presse: 1 } },
  },
  citation: {
    intervient: 0.03,
    role: { choice: 'national', confidence: 0.95, probabilities: { national: 0.95 } },
    kind: { choice: 'presse', confidence: 1, probabilities: { presse: 1 } },
  },
};

/** Classifieur factice : réponse choisie selon le titre ; peut échouer à la demande. */
class FakeClassifier implements Classifier {
  readonly model: string;
  calls = 0;
  failuresLeft = 0;
  constructor(model = PINNED_MODEL) {
    this.model = model;
  }
  async classify(state: ClassifierState) {
    this.calls += 1;
    if (this.failuresLeft > 0) {
      this.failuresLeft -= 1;
      throw new Error('indisponible');
    }
    const key = Object.keys(ANSWERS).find((k) => state.title.includes(k)) ?? 'citation';
    return { model: this.model, answers: ANSWERS[key] as ClassifierAnswers, cost: 0.00003 };
  }
}

const noSleep = async () => {};

describe('règle de publication', () => {
  const t = { intervient: 0.5, role: 0.6 };
  test('national et AMF publiés, mairie et simple citation écartés', () => {
    expect(decide(ANSWERS.national as ClassifierAnswers, t)).toEqual({
      outcome: 'published',
      role: 'national',
      kind: 'tv',
    });
    expect(decide(ANSWERS.amf as ClassifierAnswers, t).outcome).toBe('published');
    expect(decide(ANSWERS.mairie as ClassifierAnswers, t).outcome).toBe('rejected');
    expect(decide(ANSWERS.citation as ClassifierAnswers, t).outcome).toBe('rejected');
  });

  test('confiance de rôle sous le seuil : écarté', () => {
    const weak = {
      ...(ANSWERS.national as ClassifierAnswers),
      role: { choice: 'national', confidence: 0.5, probabilities: {} },
    };
    expect(decide(weak, t).outcome).toBe('rejected');
  });

  test('sans seuils, rien n’est publié', () => {
    expect(decide(ANSWERS.national as ClassifierAnswers, null).outcome).toBe('rejected');
  });
});

describe('client System One', () => {
  test('envoie modèle épinglé, état et questions ; lit la réponse', async () => {
    // Tableau plutôt que variable réassignée : TypeScript ne suit pas les affectations dans une closure.
    const requests: { url: string; body: Record<string, unknown>; auth: string | null }[] = [];
    const fakeFetch = (async (url: string, init: RequestInit) => {
      requests.push({
        url,
        body: JSON.parse(String(init.body)),
        auth: new Headers(init.headers).get('Authorization'),
      });
      return Response.json({
        model: 'typesafe/jev-1.13-20260917',
        answers: {
          intervient: { type: 'noul', noul: 0.86 },
          role: {
            type: 'choice',
            choice: 'national',
            probabilities: { national: 0.99 },
            confidence: 0.99,
          },
          kind: { type: 'choice', choice: 'radio', probabilities: { radio: 1 }, confidence: 1 },
        },
        usage: { cost: 0.00003 },
      });
    }) as unknown as typeof fetch;
    const client = createSystemOneClassifier({ apiKey: 'k', fetch: fakeFetch });
    const result = await client.classify({
      title: 'L’invité de 7h50',
      description: '',
      outlet: 'France Inter',
      sourceKind: 'youtube',
      publishedAt: '2026-06-01T05:50:00.000Z',
      startsAt: null,
    });
    const sent = requests[0];
    expect(sent?.url).toBe('https://openrouter.ai/api/v1/systemone');
    expect(sent?.auth).toBe('Bearer k');
    expect(sent?.body.model).toBe(PINNED_MODEL);
    expect(typeof sent?.body.state).toBe('string');
    expect(Object.keys((sent?.body.questions as object) ?? {})).toEqual([
      'intervient',
      'role',
      'kind',
    ]);
    expect(result.answers.role.choice).toBe('national');
    expect(result.model).toBe('typesafe/jev-1.13-20260917');
  });

  test('rejette une réponse incomplète ou hors des options', () => {
    expect(() => parseAnswers({ answers: {} })).toThrow();
    expect(() =>
      parseAnswers({
        answers: {
          intervient: { type: 'noul', noul: 0.9 },
          role: { type: 'choice', choice: 'président', probabilities: {}, confidence: 1 },
          kind: { type: 'choice', choice: 'tv', probabilities: {}, confidence: 1 },
        },
      }),
    ).toThrow();
  });
});

describe('classification en base', () => {
  let db: Db;
  let drop: () => Promise<void>;

  beforeAll(async () => {
    ({ db, drop } = await createTestDb());
    await upsertSources(db, [
      { id: 'yt:bfmtv', kind: 'youtube', name: 'BFMTV', active: true },
      { id: 'yt:david-lisnard', kind: 'youtube', name: 'David Lisnard', active: true },
    ]);
  });
  afterAll(() => drop());
  beforeEach(async () => {
    await db.execute(sql`truncate ${classification}, ${item} cascade`);
  });

  const add = (key: string) =>
    upsertItem(db, {
      sourceId: 'yt:bfmtv',
      platformId: `yt:${key}`,
      url: `https://www.youtube.com/watch?v=${key}`,
      title: `Contenu ${key}`,
      description: '',
      publishedAt: new Date('2026-06-01T00:00:00Z'),
    });
  const statusOf = async (id: string) => (await db.select().from(item).where(eq(item.id, id)))[0];

  test('publie national et AMF (avec rôle), écarte mairie et simple citation', async () => {
    const ids = {
      national: (await add('national')).id,
      amf: (await add('amf')).id,
      mairie: (await add('mairie')).id,
      citation: (await add('citation')).id,
    };
    const stats = await classifyPending(db, new FakeClassifier(), { sleep: noSleep });
    expect(stats).toMatchObject({ classified: 4, published: 2, rejected: 2, failed: 0 });
    expect(await statusOf(ids.national)).toMatchObject({
      status: 'published',
      role: 'national',
      kind: 'tv',
    });
    expect(await statusOf(ids.amf)).toMatchObject({ status: 'published', role: 'amf' });
    expect((await statusOf(ids.mairie))?.status).toBe('rejected');
    expect((await statusOf(ids.citation))?.status).toBe('rejected');
    const [entry] = await db
      .select()
      .from(classification)
      .where(eq(classification.itemId, ids.national));
    expect(entry).toMatchObject({ model: PINNED_MODEL, questionsVersion: QUESTIONS_VERSION });
    expect(entry?.thresholds).toEqual(thresholdsFor(PINNED_MODEL));
  });

  test('chaîne officielle : intervention présumée, mais le rôle mairie reste écarté', async () => {
    const add = (key: string) =>
      upsertItem(db, {
        sourceId: 'yt:david-lisnard',
        platformId: `yt:off-${key}`,
        url: `https://www.youtube.com/watch?v=${key}`,
        title: `Contenu ${key}`,
        description: '',
        publishedAt: new Date('2026-06-01T00:00:00Z'),
      });
    const clip = (await add('clip')).id;
    const cannes = (await add('cannes')).id;
    const lowSpeaking = (role: string): ClassifierAnswers => ({
      intervient: 0.6,
      role: { choice: role, confidence: 0.95, probabilities: {} },
      kind: { choice: 'stream', confidence: 1, probabilities: {} },
    });
    const classifier: Classifier = {
      model: PINNED_MODEL,
      classify: async (state) => ({
        model: PINNED_MODEL,
        answers: lowSpeaking(state.title.includes('cannes') ? 'mairie' : 'national'),
        cost: 0,
      }),
    };
    await classifyPending(db, classifier, { sleep: noSleep });
    expect((await statusOf(clip))?.status).toBe('published');
    expect((await statusOf(cannes))?.status).toBe('rejected');
  });

  test('cache : pas de nouvel appel si l’entrée n’a pas changé', async () => {
    await add('national');
    const classifier = new FakeClassifier();
    await classifyPending(db, classifier, { sleep: noSleep });
    await classifyPending(db, classifier, { sleep: noSleep });
    expect(classifier.calls).toBe(1);
  });

  test('modèle sans seuils : classé et journalisé, mais rien n’est publié', async () => {
    const { id } = await add('national');
    await classifyPending(db, new FakeClassifier('modele/inconnu'), { sleep: noSleep });
    expect((await statusOf(id))?.status).toBe('rejected');
    const [entry] = await db.select().from(classification);
    expect(entry?.thresholds).toBeNull();
  });

  test('indisponibilité : 3 tentatives, puis le contenu reste en attente', async () => {
    const { id } = await add('national');
    const classifier = new FakeClassifier();
    classifier.failuresLeft = 3;
    const stats = await classifyPending(db, classifier, { sleep: noSleep });
    expect(stats.failed).toBe(1);
    expect(classifier.calls).toBe(3);
    expect((await statusOf(id))?.status).toBe('pending');
    // Cycle suivant : le classifieur répond, le contenu est publié.
    await classifyPending(db, classifier, { sleep: noSleep });
    expect((await statusOf(id))?.status).toBe('published');
  });

  test('cycle borné dans le temps : on s’arrête après le budget, le reste attend', async () => {
    for (const key of ['national', 'national-2', 'national-3']) await add(key);
    let t = 0;
    const classifier = new FakeClassifier();
    const original = classifier.classify.bind(classifier);
    classifier.classify = async (state) => {
      t += 1_000;
      return original(state);
    };
    const stats = await classifyPending(db, classifier, {
      sleep: noSleep,
      budgetMs: 1_500,
      now: () => t,
    });
    expect(stats.classified).toBe(2);
    expect((await db.select().from(item).where(eq(item.status, 'pending'))).length).toBe(1);
  });

  test('les contenus les plus récents passent en premier', async () => {
    const old = await add('national-ancien');
    await db.execute(
      sql`update item set first_seen_at = now() - interval '1 day' where id = ${old.id}`,
    );
    const recent = await add('national-recent');
    const classifier = new FakeClassifier();
    await classifyPending(db, classifier, { sleep: noSleep, limit: 1 });
    expect((await statusOf(recent.id))?.status).toBe('published');
    expect((await statusOf(old.id))?.status).toBe('pending');
  });

  test('recalcul avec de nouveaux seuils, sans appel au classifieur', async () => {
    const { id } = await add('amf');
    const classifier = new FakeClassifier();
    await classifyPending(db, classifier, { sleep: noSleep });
    expect((await statusOf(id))?.status).toBe('published');
    const result = await recompute(db, () => ({ intervient: 0.99, role: 0.6 }));
    expect(result).toEqual({ changed: 1, total: 1 });
    expect((await statusOf(id))?.status).toBe('rejected');
    expect(classifier.calls).toBe(1);
    const entries = await db.select().from(classification).where(eq(classification.itemId, id));
    expect(entries).toHaveLength(2); // traçabilité : nouvelle entrée, ancienne intacte
  });

  test('reclassification : nouvelle entrée de journal, la plus récente fait foi', async () => {
    const { id } = await add('national');
    const classifier = new FakeClassifier();
    await classifyPending(db, classifier, { sleep: noSleep });
    const stats = await reclassify(db, classifier, { model: PINNED_MODEL }, { sleep: noSleep });
    expect(stats.classified).toBe(1);
    expect(classifier.calls).toBe(2);
    expect(
      await db.select().from(classification).where(eq(classification.itemId, id)),
    ).toHaveLength(2);
  });
});
