import type { Db } from '@lisnard/db/client';

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

export function createContext(opts: CreateContextOptions): Context {
  return opts;
}
