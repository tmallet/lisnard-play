import type { Db } from '@lisnard/db/client';
import { getRecap, listRecapDays, type RecapData } from '@lisnard/db/read';
import { z } from 'zod';

import { requireDb } from '../context';
import { type MembershipData, sharedMembershipSource } from '../membership/source';
import { publicProcedure, router } from '../trpc';
import { parisDay } from './membership';

/** Jour AAAA-MM-JJ décalé de `n` jours (calcul en UTC, sans heure). */
export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Lundi de la semaine d'un jour. */
export function mondayOf(day: string): string {
  const weekday = (new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7;
  return addDays(day, -weekday);
}

export type Period = 'day' | 'week';

/** Bornes d'une période ; null si la date n'est pas valide (semaine : un lundi). */
export function periodBounds(period: Period, start: string): { from: string; to: string } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || addDays(start, 0) !== start) return null;
  if (period === 'day') return { from: start, to: start };
  return mondayOf(start) === start ? { from: start, to: addDays(start, 6) } : null;
}

type MemberDays = { day: string; members: number }[];

/**
 * Adhérents par jour, triés une fois, le jour en cours compris (total en direct, comme
 * le graphique).
 */
function membersByDay(data: MembershipData | null, today: string): MemberDays {
  const days = new Map((data?.history ?? []).map((d) => [d.day, d.members]));
  if (data && !days.has(today)) days.set(today, data.total.members);
  return [...days]
    .map(([day, members]) => ({ day, members }))
    .sort((a, b) => a.day.localeCompare(b.day));
}

/** Valeur connue au plus tard ce jour-là (jours triés). */
function membersAt(days: MemberDays, day: string): number | null {
  let found: number | null = null;
  for (const d of days) {
    if (d.day > day) break;
    found = d.members;
  }
  return found;
}

/**
 * Adhésions d'une période : total en fin, hausse depuis la veille du début (null si
 * la veille précède l'historique), courbe.
 */
export function membersOf(
  days: MemberDays,
  from: string,
  to: string,
  curveFrom: string,
): { total: number; delta: number | null; curve: MemberDays } | null {
  const total = membersAt(days, to);
  if (total === null) return null;
  const before = membersAt(days, addDays(from, -1));
  const curve: { day: string; members: number }[] = [];
  for (let d = curveFrom; d <= to; d = addDays(d, 1)) {
    const members = membersAt(days, d);
    if (members !== null) curve.push({ day: d, members });
  }
  return { total, delta: before === null ? null : total - before, curve };
}

/** Lectures gardées une minute, comme le graphique (plusieurs visiteurs, un aperçu). */
const RECAP_MS = 60_000;
const cache = new WeakMap<Db, Map<string, { at: number; value: Promise<unknown> }>>();
function cached<T>(db: Db, key: string, load: () => Promise<T>, now = Date.now()): Promise<T> {
  const entries = cache.get(db) ?? new Map();
  cache.set(db, entries);
  const hit = entries.get(key);
  if (hit && now - hit.at < RECAP_MS) return hit.value as Promise<T>;
  if (entries.size > 200) entries.clear();
  const value = load();
  entries.set(key, { at: now, value });
  value.catch(() => entries.delete(key));
  return value;
}

export type Recap = RecapData & {
  period: Period;
  members: ReturnType<typeof membersOf>;
};

/** Récapitulatifs du jour et de la semaine (spec campaign-recaps, ADR 0031). */
export const recapRouter = router({
  /** Récapitulatif d'une période ; null si la date est invalide ou sans intervention. */
  get: publicProcedure
    .input(z.object({ period: z.enum(['day', 'week']), start: z.string().max(10) }))
    .query(async ({ ctx, input }): Promise<Recap | null> => {
      const bounds = periodBounds(input.period, input.start);
      if (!bounds) return null;
      const db = requireDb(ctx);
      const source = ctx.membership ?? sharedMembershipSource();
      const [data, { data: membership }] = await Promise.all([
        cached(db, `${bounds.from}:${bounds.to}`, () => getRecap(db, bounds.from, bounds.to)),
        source.get(),
      ]);
      if (data.interventions.length === 0) return null;
      const days = membersByDay(membership, parisDay(ctx.now?.() ?? new Date()));
      // Courbe : la semaine précédente pour un jour, la semaine et sa veille pour une semaine.
      const curveFrom = addDays(bounds.from, input.period === 'day' ? -6 : -1);
      return {
        ...data,
        period: input.period,
        members: membersOf(days, bounds.from, bounds.to, curveFrom),
      };
    }),

  /** Jours (avec intervention) et semaines récents, avec la hausse des adhérents. */
  list: publicProcedure.query(async ({ ctx }) => {
    const db = requireDb(ctx);
    const source = ctx.membership ?? sharedMembershipSource();
    const [recent, { data: membership }] = await Promise.all([
      cached(db, 'list', () => listRecapDays(db, 60)),
      source.get(),
    ]);
    const today = parisDay(ctx.now?.() ?? new Date());
    const days = membersByDay(membership, today);
    const delta = (from: string, to: string) => membersOf(days, from, to, to)?.delta ?? null;
    const weeks = new Map<string, number>();
    for (const { day, count } of recent)
      weeks.set(mondayOf(day), (weeks.get(mondayOf(day)) ?? 0) + count);
    return {
      days: recent.slice(0, 14).map(({ day, count }) => ({ day, count, delta: delta(day, day) })),
      weeks: [...weeks].slice(0, 6).map(([start, count]) => ({
        start,
        end: addDays(start, 6),
        count,
        delta: delta(start, addDays(start, 6)),
      })),
    };
  }),
});
