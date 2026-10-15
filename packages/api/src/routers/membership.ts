import type { Db } from '@lisnard/db/client';
import { listTimelineItems, type TimelineItem } from '@lisnard/db/read';

import { requireDb } from '../context';
import { sharedMembershipSource } from '../membership/source';
import { publicProcedure, router } from '../trpc';

/** Durée de vie de la liste des interventions du graphique, partagée entre visiteurs. */
export const TIMELINE_ITEMS_MS = 60_000;
const itemsCache = new WeakMap<Db, { at: number; items: Promise<TimelineItem[]> }>();

/**
 * Interventions du graphique, gardées une minute par connexion : chaque visiteur de
 * l'onglet rafraîchit toutes les deux minutes, la requête complète n'est faite qu'une fois.
 */
export function cachedTimelineItems(db: Db, now = Date.now()): Promise<TimelineItem[]> {
  const hit = itemsCache.get(db);
  if (hit && now - hit.at < TIMELINE_ITEMS_MS) return hit.items;
  const items = listTimelineItems(db);
  itemsCache.set(db, { at: now, items });
  // Échec : on ne garde pas la promesse rejetée, le prochain appel réessaie.
  items.catch(() => itemsCache.delete(db));
  return items;
}

/** Jour en cours à Paris (AAAA-MM-JJ). */
export function parisDay(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(now);
}

/**
 * Adhésions et interventions (spec membership-timeline, ADR 0026). L'historique est
 * coupé à la plus ancienne intervention ; le jour en cours prend le total en direct.
 */
export const membershipRouter = router({
  timeline: publicProcedure.query(async ({ ctx }) => {
    const source = ctx.membership ?? sharedMembershipSource();
    const [{ data, stale }, interventions] = await Promise.all([
      source.get(),
      cachedTimelineItems(requireDb(ctx)),
    ]);
    const start = interventions[0]?.day;
    const days = (data?.history ?? []).filter((d) => !start || d.day >= start);
    const today = parisDay(ctx.now?.() ?? new Date());
    if (data && (days.at(-1)?.day ?? '') < today)
      days.push({ day: today, members: data.total.members });
    return {
      total: data?.total ?? null,
      days,
      interventions,
      stale,
      source: 'Nouvelle Énergie' as const,
    };
  }),
});
