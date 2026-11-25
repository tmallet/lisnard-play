/**
 * Récapitulatifs (spec campaign-recaps, ADR 0031) : version de l'image et données de la
 * carte, à partir de `recap.get`.
 */

import type { RecapPeriod } from '../lib/recap';
import { fingerprint } from '../lib/seo';
import type { RecapCardData } from './recap-card';

/** Récapitulatif renvoyé par `recap.get` (champs utiles ici). */
export interface RecapAt {
  period: RecapPeriod;
  from: string;
  to: string;
  interventions: unknown[];
  outlets: { name: string; official: boolean; count: number }[];
  places: { label: string; lat: number; lon: number }[];
  quote: { text: string; outlet: string; official: boolean } | null;
  members: {
    total: number;
    delta: number | null;
    curve: { day: string; members: number }[];
  } | null;
}

/** Contenu qui change l'image : un récapitulatif qui évolue (jour en cours) change d'adresse. */
export const recapVersion = (r: RecapAt) =>
  fingerprint(
    JSON.stringify([r.interventions.length, r.members?.total ?? null, r.quote?.text ?? null]),
  );

export const recapCardData = (r: RecapAt, host: string): RecapCardData => ({
  period: r.period,
  from: r.from,
  to: r.to,
  count: r.interventions.length,
  outlets: r.outlets,
  places: r.places,
  members: r.members,
  quote: r.quote,
  host,
});
