/**
 * Tâche `places` (spec intervention-places, design D2) : lieu des interventions
 * publiées, par lots, dans la limite du plafond quotidien partagé avec les résumés.
 * Une réponse du modèle n'est jamais payée deux fois : si la géolocalisation échoue,
 * elle est gardée et refaite plus tard sans rappeler le modèle.
 */
import type { Db } from '@lisnard/db/client';
import type { PlaceRecord } from '@lisnard/db/schema';
import {
  addSummarySpend,
  listPendingGeocodes,
  listPlaceTargets,
  recordPlace,
  recordPlaceFailure,
  summarySpentOn,
} from '@lisnard/db/write';

import { errorMessage, log } from '../log';
import { InvalidSummaryResponse, SummaryServiceUnavailable } from '../summaries/openrouter';
import { parisDay } from '../summaries/task';
import { geocodeCity, type Locator } from './locate';
import { PLACE_PROMPT_VERSION } from './prompt';

/** Au-delà, l'intervention est abandonnée (sans lieu) jusqu'à la prochaine consigne. */
export const MAX_PLACE_ATTEMPTS = 3;
/** Attente avant un nouvel essai : 30 min, puis 1 h. */
export const PLACE_RETRY_MS = [30 * 60_000, 60 * 60_000];

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
  abandoned: number;
  geocoded: number;
  cost: number;
  budgetReached: boolean;
  unavailable?: string;
}

/** Géolocalisations en attente (Base adresse nationale indisponible lors du premier essai). */
async function retryGeocodes(db: Db, fetchFn: typeof fetch, stats: PlacesStats) {
  for (const { id, place } of await listPendingGeocodes(db, 50)) {
    if (!place?.query) continue;
    const geo = await geocodeCity(place.query.city, place.query.department, fetchFn).catch(
      () => undefined,
    );
    // Encore indisponible : inutile d'insister sur les suivants ce cycle-ci.
    if (geo === undefined) break;
    await recordPlace(db, id, {
      ...place,
      city: geo?.city ?? null,
      lat: geo?.lat ?? null,
      lon: geo?.lon ?? null,
      geocodePending: false,
    });
    stats.geocoded += 1;
  }
}

export async function locatePending(
  db: Db,
  locator: Locator,
  { dailyBudget, limit = 20, fetch: fetchFn = fetch, now = () => new Date() }: PlacesOptions,
): Promise<PlacesStats> {
  const stats: PlacesStats = {
    located: 0,
    onSite: 0,
    failed: 0,
    abandoned: 0,
    geocoded: 0,
    cost: 0,
    budgetReached: false,
  };
  await retryGeocodes(db, fetchFn, stats);
  const day = parisDay(now());
  for (const target of await listPlaceTargets(db, PLACE_PROMPT_VERSION, limit)) {
    if ((await summarySpentOn(db, day)) >= dailyBudget) {
      stats.budgetReached = true;
      break;
    }
    const base = {
      promptVersion: PLACE_PROMPT_VERSION,
      generatedAt: now().toISOString(),
    };
    try {
      const { answer, model, cost } = await locator.ask(target);
      await addSummarySpend(db, day, cost);
      stats.cost += cost;
      const query = { city: answer.city, department: answer.department };
      const toLocate = answer.onSite && answer.precision !== 'country';
      // Erreur de géolocalisation : la réponse payée est gardée, la géolocalisation
      // sera refaite plus tard (retryGeocodes).
      const geo = toLocate
        ? await geocodeCity(answer.city, answer.department, fetchFn).catch((error) => {
            log.warn('géolocalisation différée', { item: target.id, error: errorMessage(error) });
            return undefined;
          })
        : null;
      const place: PlaceRecord = {
        ...base,
        onSite: answer.onSite,
        label: answer.onSite ? [answer.city, answer.department].filter(Boolean).join(', ') : null,
        city: geo?.city ?? null,
        lat: geo?.lat ?? null,
        lon: geo?.lon ?? null,
        approximate: answer.precision === 'department' || answer.precision === 'region',
        query: toLocate ? query : null,
        geocodePending: toLocate && geo === undefined,
        model,
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
      const attempts = await recordPlaceFailure(
        db,
        target.id,
        PLACE_RETRY_MS[Math.min(target.attempts, PLACE_RETRY_MS.length - 1)] ?? 0,
      );
      if (attempts >= MAX_PLACE_ATTEMPTS) {
        // Abandon : plus d'appel payé pour cette intervention, jusqu'à une nouvelle consigne.
        await recordPlace(db, target.id, {
          ...base,
          onSite: false,
          label: null,
          city: null,
          lat: null,
          lon: null,
          approximate: false,
          failed: true,
          model: locator.model,
          cost: 0,
        });
        stats.abandoned += 1;
      } else stats.failed += 1;
      log.warn('lieu non déterminé', { item: target.id, attempts, error: errorMessage(error) });
    }
  }
  return stats;
}
