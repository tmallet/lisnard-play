/**
 * Production des résumés (spec intervention-summaries, design D2, D4, D5) : vidéos
 * publiées sans résumé de la version courante, dans la limite d'un budget quotidien.
 */
import type { Db } from '@lisnard/db/client';
import type { SummaryRecord } from '@lisnard/db/schema';
import {
  listSummaryTargets,
  recordSummary,
  recordSummaryFailure,
  summaryCostSince,
} from '@lisnard/db/write';

import { errorMessage, log } from '../log';
import { type Summarizer, SummaryServiceUnavailable } from './openrouter';
import { PROMPT_VERSION } from './prompt';

export interface SummarizeOptions {
  /** Plafond de dépense du jour, en dollars. */
  dailyBudget: number;
  /** Résumés au plus par cycle. */
  limit?: number;
  maxAttempts?: number;
  /** Au-delà, la vidéo est ignorée (coût d'un meeting de plusieurs heures). */
  maxDurationS?: number;
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

/** Minuit à Paris pour la date donnée : début de la période du plafond quotidien. */
export function parisMidnight(now: Date): Date {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Paris',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  const elapsed =
    (Number(parts.hour) * 3600 + Number(parts.minute) * 60 + Number(parts.second)) * 1000;
  return new Date(Math.floor(now.getTime() / 1000) * 1000 - elapsed);
}

export async function summarizePending(
  db: Db,
  summarizer: Summarizer,
  {
    dailyBudget,
    limit = 5,
    maxAttempts = 3,
    maxDurationS = 3 * 3600,
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
  let spent = await summaryCostSince(db, parisMidnight(now()));
  const record = (over: Pick<SummaryRecord, 'cost'> & Partial<SummaryRecord>) =>
    ({
      model: summarizer.model,
      promptVersion: PROMPT_VERSION,
      generatedAt: now().toISOString(),
      ...over,
    }) as SummaryRecord;

  for (const target of await listSummaryTargets(db, limit, PROMPT_VERSION)) {
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
      spent += cost;
      stats.cost += cost;
      await recordSummary(
        db,
        target.id,
        output.speaks
          ? record({ kind: 'ok', text: output.summary, points: output.points, model, cost })
          : record({ kind: 'none', reason: 'not_speaking', model, cost }),
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
      // Le contenu reste sans résumé ; abandon au plafond de tentatives (spec).
      stats.failed += 1;
      const { abandoned } = await recordSummaryFailure(
        db,
        target.id,
        maxAttempts,
        record({ kind: 'none', reason: 'failed', cost: 0 }),
      );
      log.warn('résumé en échec', { item: target.id, abandoned, error: errorMessage(error) });
    }
  }
  return stats;
}
