/**
 * Classification et publication (spec intervention-classification, ADR 0004, 0005).
 */
import type { Db } from '@lisnard/db/client';
import { item, source } from '@lisnard/db/schema';
import {
  type ClassificationTarget,
  inputHashSql,
  listClassificationTargets,
  listLatestClassifications,
  recordClassification,
} from '@lisnard/db/write';
import { eq, inArray, sql } from 'drizzle-orm';

import { decide } from './classifier/decide';
import { MAX_DESCRIPTION, QUESTIONS_VERSION } from './classifier/questions';
import { thresholdsFor } from './classifier/thresholds';
import type { Classifier, ClassifierState } from './classifier/types';
import { errorMessage, log } from './log';
import { isOfficialSource } from './sources.config';

export interface ClassifyOptions {
  limit?: number;
  attempts?: number;
  sleep?: (ms: number) => Promise<void>;
}

export interface ClassifyStats {
  classified: number;
  published: number;
  rejected: number;
  failed: number;
  cost: number;
}

export function toState(t: ClassificationTarget): ClassifierState {
  return {
    title: t.title,
    description: t.description.slice(0, MAX_DESCRIPTION),
    outlet: t.outlet,
    sourceKind: t.sourceKind,
    publishedAt: t.publishedAt.toISOString(),
    startsAt: t.startsAt?.toISOString() ?? null,
  };
}

async function withRetry<T>(
  fn: () => Promise<T>,
  attempts: number,
  sleep: (ms: number) => Promise<void>,
): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < attempts - 1) await sleep(500 * 2 ** i);
    }
  }
  throw lastError;
}

async function classifyOne(
  db: Db,
  classifier: Classifier,
  target: ClassificationTarget,
  stats: ClassifyStats,
  attempts: number,
  sleep: (ms: number) => Promise<void>,
): Promise<void> {
  try {
    const result = await withRetry(() => classifier.classify(toState(target)), attempts, sleep);
    // Les seuils sont indexés par le modèle configuré (épinglé), pas par l'instantané renvoyé.
    const thresholds = thresholdsFor(classifier.model);
    if (!thresholds)
      log.error('aucun seuil pour le modèle : publication bloquée', { model: classifier.model });
    const decision = decide(result.answers, thresholds, {
      presumeSpeaking: isOfficialSource(target.sourceId),
    });
    await recordClassification(db, {
      itemId: target.id,
      model: result.model,
      questionsVersion: QUESTIONS_VERSION,
      inputHash: target.inputHash,
      answers: result.answers,
      thresholds,
      ...decision,
    });
    stats.classified += 1;
    stats.cost += result.cost;
    if (decision.outcome === 'published') stats.published += 1;
    else stats.rejected += 1;
  } catch (error) {
    // Le contenu reste en attente et sera retenté au cycle suivant (spec).
    stats.failed += 1;
    log.warn('classification en échec : contenu laissé en attente', {
      item: target.id,
      error: errorMessage(error),
    });
  }
}

/** Classe les contenus en attente ou dont l'entrée a changé (cache par empreinte). */
export async function classifyPending(
  db: Db,
  classifier: Classifier,
  { limit = 50, attempts = 3, sleep = Bun.sleep }: ClassifyOptions = {},
): Promise<ClassifyStats> {
  const stats: ClassifyStats = { classified: 0, published: 0, rejected: 0, failed: 0, cost: 0 };
  const targets = await listClassificationTargets(db, limit, QUESTIONS_VERSION);
  for (const target of targets) await classifyOne(db, classifier, target, stats, attempts, sleep);
  return stats;
}

/**
 * Recalcule la publication de chaque contenu avec les seuils actuels, à partir des
 * probabilités journalisées, sans appeler le classifieur (spec « Recalcul sans nouvel
 * appel »). Chaque changement ajoute une entrée au journal, pour la traçabilité.
 */
export async function recompute(
  db: Db,
  thresholdsLookup: typeof thresholdsFor = thresholdsFor,
): Promise<{ changed: number; total: number }> {
  const latest = await listLatestClassifications(db);
  let changed = 0;
  for (const c of latest) {
    // Le modèle épinglé étant un instantané daté, le modèle servi est le même identifiant.
    const thresholds = thresholdsLookup(c.model);
    const decision = decide(c.answers, thresholds, {
      presumeSpeaking: isOfficialSource(c.sourceId),
    });
    if (decision.outcome === c.outcome) continue;
    await recordClassification(db, {
      itemId: c.itemId,
      model: c.model,
      questionsVersion: c.questionsVersion,
      inputHash: c.inputHash,
      answers: c.answers,
      thresholds,
      ...decision,
    });
    changed += 1;
  }
  return { changed, total: latest.length };
}

/**
 * Reclassifie des contenus déjà classés (changement de modèle ou de version), en
 * ignorant le cache. Filtre facultatif sur le modèle ou la version de la dernière décision.
 */
export async function reclassify(
  db: Db,
  classifier: Classifier,
  filter: { model?: string; questionsVersion?: number } = {},
  options: ClassifyOptions = {},
): Promise<ClassifyStats> {
  const latest = await listLatestClassifications(db);
  const ids = latest
    .filter((c) => (filter.model ? c.model === filter.model : true))
    .filter((c) =>
      filter.questionsVersion ? c.questionsVersion === filter.questionsVersion : true,
    )
    .map((c) => c.itemId);
  const stats: ClassifyStats = { classified: 0, published: 0, rejected: 0, failed: 0, cost: 0 };
  if (ids.length === 0) return stats;
  const targets = (await db
    .select({
      id: item.id,
      sourceId: item.sourceId,
      sourceKind: source.kind,
      outlet: sql<string>`coalesce(${item.outlet}, ${source.name})`,
      url: item.url,
      title: item.title,
      description: item.description,
      publishedAt: item.publishedAt,
      startsAt: item.startsAt,
      inputHash: inputHashSql(QUESTIONS_VERSION),
    })
    .from(item)
    .innerJoin(source, eq(item.sourceId, source.id))
    .where(inArray(item.id, ids))) as ClassificationTarget[];
  for (const target of targets)
    await classifyOne(
      db,
      classifier,
      target,
      stats,
      options.attempts ?? 3,
      options.sleep ?? Bun.sleep,
    );
  return stats;
}
