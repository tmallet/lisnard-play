/**
 * Note « marquante » des citations (spec campaign-recaps, ADR 0031) : une question
 * vrai/faux posée à Jev (ADR 0004, modèle épinglé) pour chaque citation, une fois par
 * version. La probabilité est gardée en base ; les récapitulatifs prennent la plus haute.
 * Toute modification du texte de la question incrémente STRIKING_VERSION.
 */

import type { Db } from '@lisnard/db/client';
import { listQuotesToScore, type QuoteToScore, recordQuoteScore } from '@lisnard/db/write';
import { PINNED_MODEL, SYSTEM_ONE_ENDPOINT } from '../classifier/systemone';
import { log } from '../log';

export const STRIKING_VERSION = 1;

export const STRIKING_QUESTION = {
  marquante: {
    type: 'noul',
    instructions:
      "Cette citation de David Lisnard est-elle marquante : une formule forte, courte et frappante, qui pourrait être reprise telle quelle en titre de presse ou dans un message sur les réseaux sociaux ? Répondre faux pour une phrase d'explication, de transition, de contexte ou de politesse, ou une phrase qui ne se comprend pas sans ce qui précède.",
  },
} as const;

/** Réponse inexploitable pour cette citation : on ne la redemande pas (pas de blocage). */
export class InvalidStrikingResponse extends Error {}

export interface StrikingScorer {
  score(quote: QuoteToScore): Promise<{ striking: number; cost: number }>;
}

export function createStrikingScorer(options: {
  apiKey: string;
  model?: string;
  fetch?: typeof fetch;
}): StrikingScorer {
  const model = options.model ?? PINNED_MODEL;
  const doFetch = options.fetch ?? fetch;
  return {
    async score(quote) {
      const res = await doFetch(SYSTEM_ONE_ENDPOINT, {
        method: 'POST',
        headers: { Authorization: `Bearer ${options.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          state: JSON.stringify({ citation: quote.text, intervention: quote.title }),
          questions: STRIKING_QUESTION,
        }),
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) throw new Error(`System One : HTTP ${res.status}`);
      const body = (await res.json()) as {
        answers?: { marquante?: { noul?: unknown } };
        usage?: { cost?: number };
      };
      const p = body.answers?.marquante?.noul;
      if (typeof p !== 'number' || p < 0 || p > 1)
        throw new InvalidStrikingResponse('réponse invalide : marquante');
      return { striking: p, cost: body.usage?.cost ?? 0 };
    },
  };
}

/**
 * Note les citations en attente, `limit` au plus. Service indisponible : le cycle
 * s'arrête et reprend au suivant. Réponse inexploitable pour une citation : elle est
 * écartée sans note pour cette version, sinon elle bloquerait toutes les autres.
 */
export async function scorePendingQuotes(
  db: Db,
  scorer: StrikingScorer,
  options: { limit?: number } = {},
): Promise<{ scored: number; failed: number; cost: number }> {
  const stats = { scored: 0, failed: 0, cost: 0 };
  for (const quote of await listQuotesToScore(db, STRIKING_VERSION, options.limit ?? 25)) {
    try {
      const { striking, cost } = await scorer.score(quote);
      await recordQuoteScore(db, quote.id, striking, STRIKING_VERSION);
      stats.scored += 1;
      stats.cost += cost;
    } catch (error) {
      stats.failed += 1;
      log.warn('citation non notée', { quote: quote.id, error: String(error) });
      if (!(error instanceof InvalidStrikingResponse)) break;
      await recordQuoteScore(db, quote.id, null, STRIKING_VERSION);
    }
  }
  return stats;
}
