/**
 * Production des résumés (spec intervention-summaries, design D2, D4, D5) : vidéos
 * publiées sans résumé de la version courante, dans la limite d'un budget quotidien.
 */
import type { Db } from '@lisnard/db/client';
import type { SummaryRecord } from '@lisnard/db/schema';
import {
  addSummarySpend,
  listSummaryTargets,
  recordSummary,
  recordSummaryFailure,
  summarySpentOn,
} from '@lisnard/db/write';

import { errorMessage, log } from '../log';
import { InvalidSummaryResponse, type Summarizer, SummaryServiceUnavailable } from './openrouter';
import { PROMPT_VERSION } from './prompt';

export interface SummarizeOptions {
  /** Plafond de dépense du jour, en dollars. */
  dailyBudget: number;
  /** Résumés au plus par cycle. */
  limit?: number;
  maxAttempts?: number;
  /** Au-delà, la vidéo est ignorée (coût d'un meeting de plusieurs heures). */
  maxDurationS?: number;
  /**
   * Durée maximale d'un cycle, en millisecondes : les tâches tournent en série et une
   * vidéo longue prend jusqu'à une minute (collecte et pulsation ne doivent pas attendre).
   */
  budgetMs?: number;
  now?: () => Date;
}

export interface SummarizeStats {
  summarized: number;
  notSpeaking: number;
  skipped: number;
  failed: number;
  cost: number;
  budgetReached: boolean;
  /** Service indisponible (crédit, débit, panne) : cycle interrompu, à reprendre plus tard. */
  unavailable?: string;
}

/** Jour à Paris (« AAAA-MM-JJ ») : période du plafond quotidien. */
export function parisDay(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(now);
}

/**
 * Attente avant l'essai suivant : 15 min, puis 1 h. Un direct qui vient de se terminer
 * n'est souvent pas encore lisible (rediffusion en préparation chez YouTube).
 */
export const RETRY_DELAYS_MS = [15 * 60_000, 60 * 60_000];

export async function summarizePending(
  db: Db,
  summarizer: Summarizer,
  {
    dailyBudget,
    limit = 5,
    maxAttempts = 3,
    maxDurationS = 3 * 3600,
    budgetMs = 150_000,
    now = () => new Date(),
  }: SummarizeOptions,
): Promise<SummarizeStats> {
  const stats: SummarizeStats = {
    summarized: 0,
    notSpeaking: 0,
    skipped: 0,
    failed: 0,
    cost: 0,
    budgetReached: false,
  };
  const day = parisDay(now());
  let spent = await summarySpentOn(db, day);
  const pay = async (cost: number) => {
    spent += cost;
    stats.cost += cost;
    await addSummarySpend(db, day, cost);
  };
  const record = (over: Pick<SummaryRecord, 'cost'> & Partial<SummaryRecord>) =>
    ({
      model: summarizer.model,
      promptVersion: PROMPT_VERSION,
      generatedAt: now().toISOString(),
      ...over,
    }) as SummaryRecord;

  const deadline = now().getTime() + budgetMs;
  for (const target of await listSummaryTargets(db, limit, PROMPT_VERSION)) {
    if (now().getTime() >= deadline) break;
    if (spent >= dailyBudget) {
      stats.budgetReached = true;
      break;
    }
    if (target.durationS !== null && target.durationS > maxDurationS) {
      await recordSummary(db, target.id, record({ kind: 'none', reason: 'too_long', cost: 0 }));
      stats.skipped += 1;
      continue;
    }
    try {
      const { model, output, cost } = await summarizer.summarize(target);
      await pay(cost);
      await recordSummary(
        db,
        target.id,
        output.speaks
          ? record({ kind: 'ok', text: output.summary, points: output.points, model, cost })
          : record({ kind: 'none', reason: 'not_speaking', model, cost }),
        output.speaks ? output.quotes : [],
      );
      if (output.speaks) stats.summarized += 1;
      else stats.notSpeaking += 1;
    } catch (error) {
      if (error instanceof SummaryServiceUnavailable) {
        // Rien ne tient à la vidéo : on n'use pas ses tentatives et on arrête le cycle.
        stats.unavailable = error.message;
        log.error('résumés interrompus : service indisponible', { error: error.message });
        break;
      }
      if (error instanceof InvalidSummaryResponse) await pay(error.cost);
      // Le contenu reste sans résumé ; nouvel essai plus tard, abandon au plafond (spec).
      stats.failed += 1;
      const { abandoned } = await recordSummaryFailure(
        db,
        target.id,
        maxAttempts,
        record({ kind: 'none', reason: 'failed', cost: 0 }),
        RETRY_DELAYS_MS[Math.min(target.summaryAttempts, RETRY_DELAYS_MS.length - 1)],
      );
      log.warn('résumé en échec', { item: target.id, abandoned, error: errorMessage(error) });
    }
  }
  return stats;
}
