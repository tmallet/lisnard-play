import { getPublishedById, listPublished, THEMES } from '@lisnard/db/read';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

import type { Context } from '../context';
import { publicProcedure, router } from '../trpc';

function requireDb(ctx: Context) {
  if (!ctx.db)
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Base de données non configurée',
    });
  return ctx.db;
}

/** Interventions publiées, en lecture seule (specs intervention-feed et intervention-themes, ADR 0017). */
export const interventionsRouter = router({
  list: publicProcedure
    .input(
      z.object({
        status: z.enum(['live', 'upcoming', 'past']),
        theme: z.enum(THEMES).optional(),
        cursor: z.string().max(500).optional(),
        limit: z.number().int().min(1).max(50).default(20),
      }),
    )
    .query(({ ctx, input }) => listPublished(requireDb(ctx), input)),

  byId: publicProcedure
    .input(z.object({ id: z.string().min(1).max(64) }))
    .query(async ({ ctx, input }) => {
      const detail = await getPublishedById(requireDb(ctx), input.id);
      if (!detail) throw new TRPCError({ code: 'NOT_FOUND', message: 'Intervention introuvable' });
      return detail;
    }),
});
