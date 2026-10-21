/**
 * API du backoffice (spec admin-backoffice) : chaque procédure exige une session dont le
 * TOTP est activé. Sans TOTP, seule `me` répond, pour guider l'association.
 */
import {
  getAdminItem,
  hideItem,
  listAdminActions,
  listAdminItems,
  requestSummary,
  unhideItem,
} from '@lisnard/db/admin';
import type { Db } from '@lisnard/db/client';
import { initTRPC, TRPCError } from '@trpc/server';
import { z } from 'zod';

export interface AdminContext {
  db: Db;
  /** Compte connecté, ou null. */
  user: { email: string; twoFactorEnabled: boolean } | null;
}

const t = initTRPC.context<AdminContext>().create();

const authed = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
  // Mot de passe seul : aucune donnée tant que le TOTP n'est pas associé.
  if (!ctx.user.twoFactorEnabled)
    throw new TRPCError({ code: 'FORBIDDEN', message: 'TOTP requis' });
  return next({ ctx: { ...ctx, user: ctx.user } });
});

const id = z.object({ id: z.string().uuid() });
const page = {
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(25),
};

export const adminRouter = t.router({
  me: t.procedure.query(({ ctx }) => ctx.user),
  items: t.router({
    list: authed
      .input(
        z.object({
          ...page,
          filter: z
            .enum(['all', 'visible', 'hidden', 'summary_failed', 'summary_requested'])
            .default('all'),
          search: z.string().trim().max(100).optional(),
        }),
      )
      .query(({ ctx, input }) =>
        listAdminItems(ctx.db, {
          filter: input.filter,
          search: input.search || undefined,
          offset: (input.page - 1) * input.pageSize,
          limit: input.pageSize,
        }),
      ),
    get: authed.input(id).query(async ({ ctx, input }) => {
      const found = await getAdminItem(ctx.db, input.id);
      if (!found) throw new TRPCError({ code: 'NOT_FOUND' });
      return found;
    }),
    hide: authed
      .input(id.extend({ reason: z.string().trim().max(300).optional() }))
      .mutation(({ ctx, input }) => hideItem(ctx.db, input.id, input.reason || null)),
    unhide: authed.input(id).mutation(({ ctx, input }) => unhideItem(ctx.db, input.id)),
    requestSummary: authed.input(id).mutation(({ ctx, input }) => requestSummary(ctx.db, input.id)),
  }),
  actions: t.router({
    list: authed.input(z.object(page)).query(({ ctx, input }) =>
      listAdminActions(ctx.db, {
        offset: (input.page - 1) * input.pageSize,
        limit: input.pageSize,
      }),
    ),
  }),
});

export type AdminRouter = typeof adminRouter;
export const createAdminCaller = t.createCallerFactory(adminRouter);
