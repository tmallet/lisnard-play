/**
 * Accès aux données côté serveur (ADR 0037) : les pages appellent les procédures tRPC de
 * `packages/api` directement (`createCaller`), avec la même validation et les mêmes règles
 * d'exposition que `/api/trpc`, sans requête HTTP. Seul l'API lit la base (ADR 0017).
 */
import { createCaller, createContext } from '@lisnard/api';
import { createDb, type Db } from '@lisnard/db/client';
import { TRPCError } from '@trpc/server';

import pkg from '../../package.json';

/**
 * Connexion unique, créée à la première requête et gardée sur globalThis : en
 * développement, Vite réévalue les modules et créerait sinon un pool à chaque fois
 * (épuisement des connexions Postgres, ADR 0019).
 */
const store = globalThis as typeof globalThis & { __lisnardDb?: Db | null };

export function getDb(): Db | null {
  if (store.__lisnardDb === undefined) {
    const url = process.env.DATABASE_URL;
    store.__lisnardDb = url ? createDb(url, { max: 5, idleTimeout: 30 }) : null;
  }
  return store.__lisnardDb;
}

/** Contexte tRPC d'une requête : commun à `/api/trpc` et aux appels serveur des pages. */
export function apiContext(req: Request) {
  return createContext({
    req,
    version: pkg.version,
    isDev: process.env.NODE_ENV !== 'production',
    db: getDb(),
    vapidPublicKey: process.env.VAPID_PUBLIC_KEY || null,
  });
}

/** Procédures de l'API, appelées dans le processus pour la requête `req`. */
export const api = (req: Request) => createCaller(apiContext(req));

/** Erreur tRPC « introuvable » : la page répond 404, jamais un 200 vide indexé. */
export const isNotFound = (error: unknown) =>
  error instanceof TRPCError && error.code === 'NOT_FOUND';
