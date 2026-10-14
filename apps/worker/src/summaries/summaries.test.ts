import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';

import type { Db } from '@lisnard/db/client';
import { classification, item, summarySpend } from '@lisnard/db/schema';
import { createTestDb } from '@lisnard/db/testing';
import {
  recordClassification,
  setMedia,
  summarySpentOn,
  upsertItem,
  upsertSources,
} from '@lisnard/db/write';
import { eq, sql } from 'drizzle-orm';
import { parseBudget } from '../config';
import {
  createOpenRouterSummarizer,
  InvalidSummaryResponse,
  parseSummaryOutput,
  type Summarizer,
  type SummaryOutput,
  SummaryServiceUnavailable,
} from './openrouter';
import { PROMPT_VERSION, SUMMARY_MODEL, SUMMARY_MODEL_LONG, summaryModelFor } from './prompt';
import { parisDay, summarizePending } from './task';

const SPEAKS: SummaryOutput = {
  speaks: true,
  summary: 'Il estime que les devoirs à la maison doivent revenir.',
  points: ['devoirs', 'école'],
};

/** Résumeur factice : réponse selon le titre, coût fixe ; peut échouer à la demande. */
class FakeSummarizer implements Summarizer {
  readonly model = SUMMARY_MODEL;
  calls = 0;
  failing = false;
  constructor(private cost = 0.01) {}
  async summarize(target: { title: string }) {
    this.calls += 1;
    if (this.failing) throw new Error('indisponible');
    const output = target.title.includes('muet')
      ? { speaks: false, summary: '', points: [] }
      : SPEAKS;
    return { model: this.model, output, cost: this.cost };
  }
}

describe('sortie du modèle', () => {
  test('valide, tronque les points et refuse une forme inattendue', () => {
    expect(
      parseSummaryOutput(
        JSON.stringify({ ...SPEAKS, points: ['a', ' b ', '', 'c', 'd', 'e', 'f', 'g'] }),
      ),
    ).toEqual({ ...SPEAKS, points: ['a', 'b', 'c', 'd', 'e', 'f'] });
    expect(parseSummaryOutput('{"speaks":false,"summary":"x","points":["y"]}')).toEqual({
      speaks: false,
      summary: '',
      points: [],
    });
    expect(() => parseSummaryOutput('pas du JSON')).toThrow();
    expect(() => parseSummaryOutput('{"speaks":true,"summary":"","points":["a"]}')).toThrow();
    expect(() => parseSummaryOutput('{"speaks":true,"summary":"Il dit.","points":[]}')).toThrow();
  });

  test('client : modèle épinglé, Google AI Studio, vidéo par URL, sortie structurée', async () => {
    const requests: Record<string, unknown>[] = [];
    const fakeFetch = (async (_url: string, init: RequestInit) => {
      requests.push(JSON.parse(String(init.body)));
      return Response.json({
        model: SUMMARY_MODEL,
        choices: [{ message: { content: JSON.stringify(SPEAKS) } }],
        usage: { cost: 0.0019 },
      });
    }) as unknown as typeof fetch;
    const client = createOpenRouterSummarizer({ apiKey: 'k', fetch: fakeFetch });
    const result = await client.summarize({
      url: 'https://www.youtube.com/watch?v=8ZmGskys_Gk',
      title: 'École',
      outlet: 'David Lisnard',
      durationS: 41,
    });
    expect(result).toEqual({ model: SUMMARY_MODEL, output: SPEAKS, cost: 0.0019 });
    const body = requests[0] as {
      model: string;
      provider: { only: string[] };
      response_format: { type: string };
      messages: { content: { type: string; video_url?: { url: string } }[] }[];
    };
    expect(body.model).toBe(SUMMARY_MODEL);
    expect(body.provider.only).toEqual(['google-ai-studio']);
    expect(body.response_format.type).toBe('json_schema');
    expect(body.messages[0]?.content[1]).toEqual({
      type: 'video_url',
      video_url: { url: 'https://www.youtube.com/watch?v=8ZmGskys_Gk' },
    });
  });

  test('modèle selon la durée : lite pour un clip, plus puissant au-delà de 20 min ou si inconnue', () => {
    expect(summaryModelFor(41)).toBe(SUMMARY_MODEL);
    expect(summaryModelFor(20 * 60)).toBe(SUMMARY_MODEL);
    expect(summaryModelFor(3600)).toBe(SUMMARY_MODEL_LONG);
    expect(summaryModelFor(null)).toBe(SUMMARY_MODEL_LONG);
  });

  test('minuit à Paris, en heure d’été comme d’hiver', () => {
    expect(parisDay(new Date('2026-10-13T21:59:00Z'))).toBe('2026-10-13');
    expect(parisDay(new Date('2026-10-13T22:01:00Z'))).toBe('2026-10-14');
    expect(parisDay(new Date('2026-12-01T00:30:00Z'))).toBe('2026-12-01');
  });

  test('plafond : défaut 1 $, valeur illisible refusée plutôt qu’ignorée', () => {
    expect(parseBudget(undefined)).toBe(1);
    expect(parseBudget('  ')).toBe(1);
    expect(parseBudget('2.5')).toBe(2.5);
    expect(() => parseBudget('1$')).toThrow();
    expect(() => parseBudget('1,5')).toThrow();
    expect(() => parseBudget('-1')).toThrow();
  });
});

describe('production des résumés', () => {
  let db: Db;
  let drop: () => Promise<void>;

  beforeAll(async () => {
    ({ db, drop } = await createTestDb());
    await upsertSources(db, [{ id: 'yt:bfmtv', kind: 'youtube', name: 'BFMTV', active: true }]);
  });
  afterAll(() => drop());
  beforeEach(async () => {
    await db.execute(sql`truncate ${classification}, ${item}, ${summarySpend} cascade`);
  });

  /** Contenu publié, avec son rendu (vidéo YouTube par défaut). */
  async function published(
    key: string,
    over: { liveStatus?: 'live' | 'ended'; durationS?: number; link?: boolean } = {},
  ) {
    const { id } = await upsertItem(db, {
      sourceId: 'yt:bfmtv',
      platformId: `yt:${key}`,
      url: `https://www.youtube.com/watch?v=${key}`,
      title: `Vidéo ${key}`,
      description: '',
      publishedAt: new Date('2026-06-01T00:00:00Z'),
      liveStatus: over.liveStatus ?? 'none',
      durationS: over.durationS ?? 120,
    });
    await recordClassification(db, {
      itemId: id,
      model: 'm',
      questionsVersion: 3,
      inputHash: 'h',
      answers: {
        intervient: 1,
        role: { choice: 'national', confidence: 1, probabilities: {} },
        kind: { choice: 'tv', confidence: 1, probabilities: {} },
      },
      thresholds: null,
      outcome: 'published',
      role: 'national',
      kind: 'tv',
      themes: [],
    });
    await setMedia(
      db,
      id,
      over.link
        ? { kind: 'link', og: {} }
        : { kind: 'embed', provider: 'youtube', embedUrl: `https://www.youtube.com/embed/${key}` },
    );
    return id;
  }
  const summaryOf = async (id: string) =>
    (await db.select({ s: item.summary }).from(item).where(eq(item.id, id)))[0]?.s;

  test('résume les vidéos terminées ; ignore direct en cours et article', async () => {
    const video = await published('video');
    const live = await published('live', { liveStatus: 'live' });
    const article = await published('article', { link: true });
    const summarizer = new FakeSummarizer();
    const stats = await summarizePending(db, summarizer, { dailyBudget: 1 });
    expect(stats).toMatchObject({ summarized: 1, failed: 0, budgetReached: false });
    expect(await summaryOf(video)).toMatchObject({
      kind: 'ok',
      text: SPEAKS.summary,
      points: SPEAKS.points,
      model: SUMMARY_MODEL,
      promptVersion: PROMPT_VERSION,
    });
    expect(await summaryOf(live)).toBeNull();
    expect(await summaryOf(article)).toBeNull();
    // Cycle suivant : rien à refaire.
    await summarizePending(db, summarizer, { dailyBudget: 1 });
    expect(summarizer.calls).toBe(1);
  });

  test('David Lisnard ne s’exprime pas : enregistré, plus redemandé', async () => {
    const id = await published('muet');
    const summarizer = new FakeSummarizer();
    expect((await summarizePending(db, summarizer, { dailyBudget: 1 })).notSpeaking).toBe(1);
    expect(await summaryOf(id)).toMatchObject({ kind: 'none', reason: 'not_speaking' });
    await summarizePending(db, summarizer, { dailyBudget: 1 });
    expect(summarizer.calls).toBe(1);
  });

  test('vidéo trop longue : ignorée sans appel au modèle', async () => {
    const id = await published('meeting', { durationS: 4 * 3600 });
    const summarizer = new FakeSummarizer();
    expect((await summarizePending(db, summarizer, { dailyBudget: 1 })).skipped).toBe(1);
    expect(await summaryOf(id)).toMatchObject({ kind: 'none', reason: 'too_long' });
    expect(summarizer.calls).toBe(0);
  });

  test('échecs : attente croissante entre les essais, abandon au troisième', async () => {
    const id = await published('panne');
    const summarizer = new FakeSummarizer();
    summarizer.failing = true;
    await summarizePending(db, summarizer, { dailyBudget: 1 });
    // Pas de nouvel essai au cycle suivant : la rediffusion peut être en préparation.
    await summarizePending(db, summarizer, { dailyBudget: 1 });
    expect(summarizer.calls).toBe(1);
    const elapse = () =>
      db.execute(sql`update item set summary_retry_at = now() - interval '1 second'`);
    await elapse();
    await summarizePending(db, summarizer, { dailyBudget: 1 });
    await elapse();
    await summarizePending(db, summarizer, { dailyBudget: 1 });
    expect(await summaryOf(id)).toMatchObject({ kind: 'none', reason: 'failed' });
    await elapse();
    await summarizePending(db, summarizer, { dailyBudget: 1 });
    expect(summarizer.calls).toBe(3);
  });

  test('réponse payée mais invalide : son coût compte dans le plafond', async () => {
    await published('invalide');
    const summarizer = new FakeSummarizer();
    summarizer.summarize = async () => {
      throw new InvalidSummaryResponse('réponse invalide : points', 0.7);
    };
    const stats = await summarizePending(db, summarizer, { dailyBudget: 1 });
    expect(stats).toMatchObject({ failed: 1, cost: 0.7 });
    expect(await summarySpentOn(db, parisDay(new Date()))).toBeCloseTo(0.7);
  });

  test('service indisponible : cycle interrompu, aucune tentative consommée', async () => {
    const id = await published('credit');
    const summarizer = new FakeSummarizer();
    summarizer.summarize = async () => {
      throw new SummaryServiceUnavailable('OpenRouter : HTTP 402');
    };
    const stats = await summarizePending(db, summarizer, { dailyBudget: 1 });
    expect(stats.unavailable).toBe('OpenRouter : HTTP 402');
    const [row] = await db
      .select({ attempts: item.summaryAttempts, summary: item.summary })
      .from(item)
      .where(eq(item.id, id));
    expect(row).toEqual({ attempts: 0, summary: null });
  });

  test('cycle borné dans le temps : la suite attend le cycle suivant', async () => {
    for (const key of ['t1', 't2', 't3']) await published(key);
    let t = Date.parse('2026-10-14T10:00:00Z');
    const summarizer = new FakeSummarizer();
    const original = summarizer.summarize.bind(summarizer);
    summarizer.summarize = async (target) => {
      t += 60_000;
      return original(target);
    };
    const stats = await summarizePending(db, summarizer, {
      dailyBudget: 10,
      budgetMs: 90_000,
      now: () => new Date(t),
    });
    expect(stats.summarized).toBe(2);
  });

  test('plafond quotidien : arrêt dès que la dépense du jour l’atteint', async () => {
    for (const key of ['a', 'b', 'c']) await published(key);
    const summarizer = new FakeSummarizer(0.6);
    const stats = await summarizePending(db, summarizer, { dailyBudget: 1 });
    expect(stats).toMatchObject({ summarized: 2, budgetReached: true });
    // Le lendemain, le plafond repart de zéro.
    const tomorrow = () => new Date(Date.now() + 24 * 3600_000);
    const next = await summarizePending(db, summarizer, { dailyBudget: 1, now: tomorrow });
    expect(next.summarized).toBe(1);
  });
});

describe('service indisponible', () => {
  test('HTTP 402, 429 ou 5xx : erreur dédiée ; 400 : échec ordinaire', async () => {
    const respond = (status: number) =>
      createOpenRouterSummarizer({
        apiKey: 'k',
        fetch: (async () => new Response('{}', { status })) as unknown as typeof fetch,
      }).summarize({
        url: 'https://www.youtube.com/watch?v=x',
        title: 't',
        outlet: 'o',
        durationS: 30,
      });
    for (const status of [402, 429, 503])
      expect(await respond(status).catch((e) => e)).toBeInstanceOf(SummaryServiceUnavailable);
    const bad = await respond(400).catch((e) => e);
    expect(bad).toBeInstanceOf(Error);
    expect(bad).not.toBeInstanceOf(SummaryServiceUnavailable);
  });
});
