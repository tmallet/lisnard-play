import { listTimelineItems } from '@lisnard/db/read';

import { requireDb } from '../context';
import { sharedMembershipSource } from '../membership/source';
import { publicProcedure, router } from '../trpc';

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
      listTimelineItems(requireDb(ctx)),
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
