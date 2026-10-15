/**
 * Tâche `places` (spec intervention-places, design D2) : lieu des interventions
 * publiées, par lots, dans la limite du plafond quotidien partagé avec les résumés.
 */
import type { Db } from '@lisnard/db/client';
import type { PlaceRecord } from '@lisnard/db/schema';
import { addSummarySpend, listPlaceTargets, recordPlace, summarySpentOn } from '@lisnard/db/write';

import { errorMessage, log } from '../log';
import { InvalidSummaryResponse, SummaryServiceUnavailable } from '../summaries/openrouter';
import { parisDay } from '../summaries/task';
import { geocodeCity, type Locator } from './locate';
import { PLACE_PROMPT_VERSION } from './prompt';

export interface PlacesOptions {
  dailyBudget: number;
  limit?: number;
  fetch?: typeof fetch;
  now?: () => Date;
}

export interface PlacesStats {
  located: number;
  onSite: number;
  failed: number;
  cost: number;
  budgetReached: boolean;
  unavailable?: string;
}

export async function locatePending(
  db: Db,
  locator: Locator,
  { dailyBudget, limit = 20, fetch: fetchFn = fetch, now = () => new Date() }: PlacesOptions,
): Promise<PlacesStats> {
  const stats: PlacesStats = { located: 0, onSite: 0, failed: 0, cost: 0, budgetReached: false };
  const day = parisDay(now());
  for (const target of await listPlaceTargets(db, PLACE_PROMPT_VERSION, limit)) {
    if ((await summarySpentOn(db, day)) >= dailyBudget) {
      stats.budgetReached = true;
      break;
    }
    try {
      const { answer, model, cost } = await locator.ask(target);
      await addSummarySpend(db, day, cost);
      stats.cost += cost;
      const geo =
        answer.onSite && answer.precision !== 'country'
          ? await geocodeCity(answer.city, answer.department, fetchFn)
          : null;
      const place: PlaceRecord = {
        onSite: answer.onSite,
        label: answer.onSite ? [answer.city, answer.department].filter(Boolean).join(', ') : null,
        city: geo?.city ?? null,
        lat: geo?.lat ?? null,
        lon: geo?.lon ?? null,
        approximate: answer.precision === 'department' || answer.precision === 'region',
        model,
        promptVersion: PLACE_PROMPT_VERSION,
        generatedAt: now().toISOString(),
        cost,
      };
      await recordPlace(db, target.id, place);
      stats.located += 1;
      if (place.lat !== null) stats.onSite += 1;
    } catch (error) {
      if (error instanceof SummaryServiceUnavailable) {
        stats.unavailable = error.message;
        break;
      }
      if (error instanceof InvalidSummaryResponse) {
        await addSummarySpend(db, day, error.cost);
        stats.cost += error.cost;
      }
      // Erreur passagère (réseau, BAN) : l'intervention reste à traiter au cycle suivant.
      stats.failed += 1;
      log.warn('lieu non déterminé', { item: target.id, error: errorMessage(error) });
    }
  }
  return stats;
}
