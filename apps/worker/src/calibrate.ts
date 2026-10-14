/**
 * Calibration des seuils sur le jeu de référence (design D5). Privilégie la précision
 * (une fausse publication coûte plus cher qu'un oubli, ADR 0005) sous la contrainte
 * d'un rappel d'au moins 80 %.
 */
import type { Db } from '@lisnard/db/client';
import {
  type ClassifierAnswers,
  classification,
  item,
  source,
  THEMES,
  type Theme,
} from '@lisnard/db/schema';
import { desc, eq, sql } from 'drizzle-orm';

import { decide } from './classifier/decide';
import { QUESTIONS_VERSION } from './classifier/questions';
import type { Classifier, ClassifierState } from './classifier/types';
import { isOfficialSource } from './sources.config';

export interface ReferenceCase {
  platformId: string;
  outlet: string;
  title: string;
  /** themes : renseigné seulement pour les cas validés sur les thèmes (design D4). */
  expected: { intervient: boolean; role: string; kind: string; themes?: Theme[] };
  note?: string;
  synthetic?: boolean;
  state?: ClassifierState;
  validated: boolean;
}

export interface CollectedAnswers {
  answers: Map<string, ClassifierAnswers>;
  /** Cas de la chaîne officielle : intervention présumée, comme à la publication (ADR 0018). */
  official: Set<string>;
}

export async function loadReference(path: string): Promise<ReferenceCase[]> {
  const text = await Bun.file(path).text();
  return text
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as ReferenceCase);
}

/** Périmètre de la campagne : seul le rôle national est publiable (ADR 0020). */
const shouldPublish = (c: ReferenceCase) => c.expected.intervient && c.expected.role === 'national';

/**
 * Probabilités par cas : dernière décision journalisée avec la version courante des
 * questions, sinon appel au classifieur (cas synthétiques ou non encore classés).
 * Repère aussi les cas de la chaîne officielle, pour que l'évaluation applique la même
 * présomption d'intervention que la publication (ADR 0018).
 */
export async function collectAnswers(
  db: Db,
  classifier: Classifier,
  cases: ReferenceCase[],
): Promise<CollectedAnswers> {
  const answers = new Map<string, ClassifierAnswers>();
  const official = new Set<string>();
  for (const c of cases) {
    if (!c.synthetic) {
      const [row] = await db
        .select({
          answers: classification.answers,
          state: {
            title: item.title,
            description: item.description,
            outlet: sql<string>`coalesce(${item.outlet}, ${source.name})`,
            sourceKind: source.kind,
            publishedAt: item.publishedAt,
            startsAt: item.startsAt,
          },
          version: classification.questionsVersion,
          sourceId: item.sourceId,
        })
        .from(item)
        .innerJoin(source, eq(item.sourceId, source.id))
        .leftJoin(classification, eq(classification.itemId, item.id))
        .where(eq(item.platformId, c.platformId))
        .orderBy(desc(classification.createdAt))
        .limit(1);
      if (row && isOfficialSource(row.sourceId)) official.add(c.platformId);
      if (row?.answers && row.version === QUESTIONS_VERSION) {
        answers.set(c.platformId, row.answers);
        continue;
      }
      if (row) {
        const s = row.state;
        const result = await classifier.classify({
          ...s,
          publishedAt: s.publishedAt.toISOString(),
          startsAt: s.startsAt?.toISOString() ?? null,
        });
        answers.set(c.platformId, result.answers);
        continue;
      }
    }
    if (c.state) answers.set(c.platformId, (await classifier.classify(c.state)).answers);
  }
  return { answers, official };
}

export interface Evaluation {
  thresholds: { intervient: number; role: number };
  tp: number;
  fp: number;
  fn: number;
  tn: number;
  precision: number;
  recall: number;
  errors: {
    platformId: string;
    title: string;
    kind: 'faux positif' | 'faux négatif';
    intervient: number;
    role: string;
    confidence: number;
    note?: string;
  }[];
}

export function evaluate(
  cases: ReferenceCase[],
  answers: Map<string, ClassifierAnswers>,
  thresholds: { intervient: number; role: number },
  official: ReadonlySet<string> = new Set(),
): Evaluation {
  const e: Evaluation = {
    thresholds,
    tp: 0,
    fp: 0,
    fn: 0,
    tn: 0,
    precision: 0,
    recall: 0,
    errors: [],
  };
  for (const c of cases) {
    const a = answers.get(c.platformId);
    if (!a) continue;
    const predicted =
      decide(a, thresholds, { presumeSpeaking: official.has(c.platformId) }).outcome ===
      'published';
    const expected = shouldPublish(c);
    if (predicted && expected) e.tp += 1;
    else if (predicted && !expected) e.fp += 1;
    else if (!predicted && expected) e.fn += 1;
    else e.tn += 1;
    if (predicted !== expected)
      e.errors.push({
        platformId: c.platformId,
        title: c.title,
        kind: predicted ? 'faux positif' : 'faux négatif',
        intervient: a.intervient,
        role: a.role.choice,
        confidence: a.role.confidence,
        ...(c.note && { note: c.note }),
      });
  }
  e.precision = e.tp + e.fp === 0 ? 1 : e.tp / (e.tp + e.fp);
  e.recall = e.tp + e.fn === 0 ? 1 : e.tp / (e.tp + e.fn);
  return e;
}

/** Exactitude du rôle et du type sur les cas où David Lisnard intervient. */
export function labelAccuracy(cases: ReferenceCase[], answers: Map<string, ClassifierAnswers>) {
  const speaking = cases.filter((c) => c.expected.intervient && answers.has(c.platformId));
  const ok = (pick: (a: ClassifierAnswers) => string, field: 'role' | 'kind') =>
    speaking.filter(
      (c) => pick(answers.get(c.platformId) as ClassifierAnswers) === c.expected[field],
    ).length / Math.max(speaking.length, 1);
  return {
    role: ok((a) => a.role.choice, 'role'),
    kind: ok((a) => a.kind.choice, 'kind'),
    cases: speaking.length,
  };
}

/**
 * Parcourt une grille de seuils et propose le couple qui maximise la précision avec un
 * rappel ≥ minRecall (à précision égale : meilleur rappel, puis seuils les plus bas).
 */
export function proposeThresholds(
  cases: ReferenceCase[],
  answers: Map<string, ClassifierAnswers>,
  minRecall = 0.8,
  official: ReadonlySet<string> = new Set(),
): Evaluation | null {
  let best: Evaluation | null = null;
  for (let i = 30; i <= 90; i += 5) {
    for (let r = 50; r <= 90; r += 5) {
      const ev = evaluate(cases, answers, { intervient: i / 100, role: r / 100 }, official);
      if (ev.recall < minRecall) continue;
      if (
        !best ||
        ev.precision > best.precision ||
        (ev.precision === best.precision && ev.recall > best.recall)
      )
        best = ev;
    }
  }
  return best;
}

export interface ThemeScore {
  theme: Theme;
  tp: number;
  fp: number;
  fn: number;
  precision: number;
  recall: number;
}

/**
 * Précision et rappel par thème, sur les cas dont les thèmes attendus sont renseignés
 * (spec intervention-themes, design D4).
 */
export function themeScores(
  cases: ReferenceCase[],
  answers: Map<string, ClassifierAnswers>,
  threshold: number,
): { cases: number; scores: ThemeScore[] } {
  const labelled = cases.filter((c) => c.expected.themes && answers.has(c.platformId));
  const scores = THEMES.map((theme) => {
    const score: ThemeScore = { theme, tp: 0, fp: 0, fn: 0, precision: 1, recall: 1 };
    for (const c of labelled) {
      const p = (answers.get(c.platformId) as ClassifierAnswers).themes?.[theme] ?? 0;
      const predicted = p >= threshold;
      const expected = c.expected.themes?.includes(theme) ?? false;
      if (predicted && expected) score.tp += 1;
      else if (predicted) score.fp += 1;
      else if (expected) score.fn += 1;
    }
    if (score.tp + score.fp > 0) score.precision = score.tp / (score.tp + score.fp);
    if (score.tp + score.fn > 0) score.recall = score.tp / (score.tp + score.fn);
    return score;
  });
  return { cases: labelled.length, scores };
}
