import { appRouter, createContext } from '@lisnard/api';
import { createDb, type Db } from '@lisnard/db/client';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';

import pkg from '../../../../package.json';

/**
 * Connexion unique, créée à la première requête et gardée sur globalThis : en
 * développement, le module est réévalué à chaque rechargement et créerait sinon un
 * nouveau pool à chaque fois (épuisement des connexions Postgres).
 */
const store = globalThis as typeof globalThis & { __lisnardDb?: Db | null };
function getDb(): Db | null {
  if (store.__lisnardDb === undefined) {
    const url = process.env.DATABASE_URL;
    store.__lisnardDb = url ? createDb(url, { max: 5, idleTimeout: 30 }) : null;
  }
  return store.__lisnardDb;
}

function handler(req: Request) {
  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: () =>
      createContext({
        req,
        version: pkg.version,
        isDev: process.env.NODE_ENV !== 'production',
        db: getDb(),
      }),
  });
}

export { handler as GET, handler as POST };
