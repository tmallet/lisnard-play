import type { Db } from '@lisnard/db/client';
import { listPlaces, type PlacedIntervention } from '@lisnard/db/read';

import { requireDb } from '../context';
import { publicProcedure, router } from '../trpc';

export interface CampaignPlace {
  key: string;
  label: string;
  lat: number;
  lon: number;
  approximate: boolean;
  interventions: Pick<PlacedIntervention, 'id' | 'title' | 'outlet' | 'day' | 'thumbnailUrl'>[];
}

/**
 * Regroupe les interventions par lieu (la Base adresse nationale renvoie les mêmes
 * coordonnées pour une même commune ; arrondi à environ 1 km par prudence), du lieu
 * le plus fréquenté au moins fréquenté. Un lieu est approximatif si tous ses repères le
 * sont : une seule intervention située précisément suffit à le placer.
 */
export function groupPlaces(items: PlacedIntervention[]): CampaignPlace[] {
  const groups = new Map<string, CampaignPlace>();
  for (const it of items) {
    const key = `${it.lat.toFixed(2)},${it.lon.toFixed(2)}`;
    const group = groups.get(key) ?? {
      key,
      label: it.city ?? it.label ?? '',
      lat: it.lat,
      lon: it.lon,
      approximate: true,
      interventions: [],
    };
    group.approximate &&= it.approximate;
    group.interventions.push({
      id: it.id,
      title: it.title,
      outlet: it.outlet,
      day: it.day,
      thumbnailUrl: it.thumbnailUrl,
    });
    groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) => b.interventions.length - a.interventions.length);
}

export const PLACES_MS = 60_000;
const cache = new WeakMap<Db, { at: number; places: Promise<CampaignPlace[]> }>();

/** Lieux gardés une minute par connexion, comme les interventions du graphique. */
export function cachedPlaces(db: Db, now = Date.now()): Promise<CampaignPlace[]> {
  const hit = cache.get(db);
  if (hit && now - hit.at < PLACES_MS) return hit.places;
  const places = listPlaces(db).then(groupPlaces);
  cache.set(db, { at: now, places });
  places.catch(() => cache.delete(db));
  return places;
}

/** Déplacements de la campagne (spec intervention-places, ADR 0027). */
export const campaignRouter = router({
  places: publicProcedure.query(async ({ ctx }) => ({
    places: await cachedPlaces(requireDb(ctx)),
  })),
});
