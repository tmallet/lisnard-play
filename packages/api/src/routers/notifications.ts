import {
  countSubscriptions,
  deleteSubscription,
  isPushServiceUrl,
  saveSubscription,
  updatePreferences,
} from '@lisnard/db/subscriptions';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

import type { Context } from '../context';
import { publicProcedure, router } from '../trpc';

/** Plafond global d'abonnements : borne le remplissage de la table (design D2). */
export const MAX_SUBSCRIPTIONS = 50_000;

const base64url = (min: number, max: number) =>
  z
    .string()
    .min(min)
    .max(max)
    .regex(/^[A-Za-z0-9_-]+=*$/);

const preferences = z.object({
  live: z.boolean(),
  reminder: z.boolean(),
  newItem: z.boolean(),
});

const endpoint = z.string().min(1).max(1000);

const subscription = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('web'),
    endpoint: endpoint.refine(isPushServiceUrl, 'Service push inconnu'),
    keys: z.object({ p256dh: base64url(80, 100), auth: base64url(16, 32) }),
    preferences: preferences.optional(),
  }),
  z.object({
    kind: z.literal('expo'),
    endpoint: endpoint.regex(/^Expo(nent)?PushToken\[[A-Za-z0-9_-]{10,200}\]$/),
    preferences: preferences.optional(),
  }),
]);

function requireDb(ctx: Context) {
  if (!ctx.db)
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Base de données non configurée',
    });
  return ctx.db;
}

const notFound = () => new TRPCError({ code: 'NOT_FOUND', message: 'Abonnement introuvable' });

/**
 * Abonnements aux notifications (spec push-notifications, ADR 0024) : seule écriture
 * permise au backend, limitée à la table des abonnements.
 */
export const notificationsRouter = router({
  /** Clé publique VAPID : null si les notifications web ne sont pas configurées. */
  config: publicProcedure.query(({ ctx }) => ({ vapidPublicKey: ctx.vapidPublicKey ?? null })),

  subscribe: publicProcedure.input(subscription).mutation(async ({ ctx, input }) => {
    const db = requireDb(ctx);
    if ((await countSubscriptions(db)) >= MAX_SUBSCRIPTIONS)
      throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: 'Abonnements complets' });
    return saveSubscription(db, {
      kind: input.kind,
      endpoint: input.endpoint,
      keys: input.kind === 'web' ? input.keys : null,
      preferences: input.preferences,
    });
  }),

  update: publicProcedure
    .input(z.object({ endpoint, preferences }))
    .mutation(async ({ ctx, input }) => {
      const prefs = await updatePreferences(requireDb(ctx), input.endpoint, input.preferences);
      if (!prefs) throw notFound();
      return prefs;
    }),

  unsubscribe: publicProcedure.input(z.object({ endpoint })).mutation(async ({ ctx, input }) => {
    if (!(await deleteSubscription(requireDb(ctx), input.endpoint))) throw notFound();
    return { ok: true as const };
  }),
});
