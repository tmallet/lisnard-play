import type { Db } from '@lisnard/db/client';
import { getQuoteAt, search } from '@lisnard/db/read';
import { z } from 'zod';

import { requireDb } from '../context';
import { publicProcedure, router } from '../trpc';

/** Résultats gardés une minute par requête normalisée (recherches répétées, fautes de frappe). */
const SEARCH_MS = 60_000;
const cache = new WeakMap<Db, Map<string, { at: number; result: ReturnType<typeof search> }>>();

export function cachedSearch(db: Db, q: string, now = Date.now()): ReturnType<typeof search> {
  const key = q.trim().toLowerCase().replace(/\s+/g, ' ');
  const entries = cache.get(db) ?? new Map();
  cache.set(db, entries);
  const hit = entries.get(key);
  if (hit && now - hit.at < SEARCH_MS) return hit.result;
  // Borne la mémoire : le cache est vidé quand il grossit trop.
  if (entries.size > 500) entries.clear();
  const result = search(db, key);
  entries.set(key, { at: now, result });
  result.catch(() => entries.delete(key));
  return result;
}

/** Citations horodatées (spec intervention-quotes, ADR 0028). */
export const quotesRouter = router({
  /** Citation d'une intervention à ce minutage (page d'une citation) ; null si elle a changé. */
  at: publicProcedure
    .input(z.object({ id: z.string().min(1).max(64), t: z.number().int().min(0).max(36_000) }))
    .query(({ ctx, input }) => getQuoteAt(requireDb(ctx), input.id, input.t)),
});

export const searchRouter = router({
  query: publicProcedure
    .input(z.object({ q: z.string().trim().min(2).max(100) }))
    .query(({ ctx, input }) => cachedSearch(requireDb(ctx), input.q)),
});
