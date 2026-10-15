import { createDb, type Db } from '@lisnard/db/client';

/**
 * Connexion unique des API routes (tRPC, plan du site), créée à la première requête et
 * gardée sur globalThis : en développement, les modules sont réévalués à chaque
 * rechargement et créeraient sinon un nouveau pool à chaque fois (épuisement des
 * connexions Postgres).
 */
const store = globalThis as typeof globalThis & { __lisnardDb?: Db | null };

export function getDb(): Db | null {
  if (store.__lisnardDb === undefined) {
    const url = process.env.DATABASE_URL;
    store.__lisnardDb = url ? createDb(url, { max: 5, idleTimeout: 30 }) : null;
  }
  return store.__lisnardDb;
}
