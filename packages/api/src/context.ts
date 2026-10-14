import type { Db } from '@lisnard/db/client';
import { TRPCError } from '@trpc/server';

export interface CreateContextOptions {
  /** Requête HTTP entrante (absente pour les appels serveur directs). */
  req?: Request;
  /** Version de l'application qui sert l'API. */
  version: string;
  /** Mode développement : active les détails d'erreur (pile d'appels). */
  isDev: boolean;
  /** Base de données en lecture (ADR 0017) ; absente si DATABASE_URL n'est pas configuré. */
  db?: Db | null;
  /** Clé publique VAPID des notifications web (ADR 0024) ; absente : web désactivé. */
  vapidPublicKey?: string | null;
}

export type Context = CreateContextOptions;

/** Connexion à la base, ou erreur propre si DATABASE_URL n'est pas configuré. */
export function requireDb(ctx: Context): Db {
  if (!ctx.db)
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Base de données non configurée',
    });
  return ctx.db;
}

/**
 * Adresse du client : dernière entrée de X-Forwarded-For, celle qu'ajoute le proxy
 * (Caddy, Coolify) ; les entrées précédentes viennent du client et ne sont pas fiables.
 */
export function clientIp(req?: Request): string {
  const forwarded = req?.headers.get('x-forwarded-for');
  return forwarded?.split(',').at(-1)?.trim() || 'direct';
}

export function createContext(opts: CreateContextOptions): Context {
  return opts;
}
