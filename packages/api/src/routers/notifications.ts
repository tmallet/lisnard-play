import {
  confirmSubscription,
  countSubscriptions,
  deleteSubscription,
  isPushServiceUrl,
  saveSubscription,
  updatePreferences,
} from '@lisnard/db/subscriptions';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

import { clientIp, requireDb } from '../context';
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

/**
 * Limite des nouveaux abonnements par adresse IP (fenêtre fixe d'une heure) : empêche de
 * remplir la table, et donc de bloquer les vrais abonnés, avec des adresses inventées.
 * En mémoire : un seul serveur d'app sert l'API (ADR 0015).
 */
export const NEW_SUBSCRIPTIONS_PER_IP_PER_HOUR = 10;
const recentSubscriptions = new Map<string, { windowStart: number; count: number }>();

export function allowNewSubscription(ip: string, now = Date.now()): boolean {
  if (recentSubscriptions.size > 10_000)
    for (const [key, w] of recentSubscriptions)
      if (now - w.windowStart > 3_600_000) recentSubscriptions.delete(key);
  const w = recentSubscriptions.get(ip);
  if (!w || now - w.windowStart > 3_600_000) {
    recentSubscriptions.set(ip, { windowStart: now, count: 1 });
    return true;
  }
  w.count += 1;
  return w.count <= NEW_SUBSCRIPTIONS_PER_IP_PER_HOUR;
}

export function resetSubscriptionLimits() {
  recentSubscriptions.clear();
}

const tooMany = (message: string) => new TRPCError({ code: 'TOO_MANY_REQUESTS', message });

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
    const record = {
      kind: input.kind,
      endpoint: input.endpoint,
      keys: input.kind === 'web' ? input.keys : null,
      preferences: input.preferences,
    };
    // Abonnement connu : simple confirmation, jamais bloquée par les limites.
    const confirmed = await confirmSubscription(db, record);
    if (confirmed) return confirmed;
    if (!allowNewSubscription(clientIp(ctx.req)))
      throw tooMany('Trop d’abonnements depuis cette adresse');
    if ((await countSubscriptions(db)) >= MAX_SUBSCRIPTIONS) throw tooMany('Abonnements complets');
    return saveSubscription(db, record);
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
