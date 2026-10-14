import { SQL } from 'bun';
import { drizzle } from 'drizzle-orm/bun-sql';

import * as schema from './schema';

export interface DbOptions {
  /** Taille maximale du pool de connexions. */
  max?: number;
  /** Fermeture des connexions inactives, en secondes. */
  idleTimeout?: number;
}

/** Client Drizzle sur le client Postgres intégré à Bun (ADR 0014). */
export function createDb(url = process.env.DATABASE_URL, options: DbOptions = {}) {
  if (!url) throw new Error('DATABASE_URL est requis.');
  const client = new SQL({ url, max: options.max ?? 10, idleTimeout: options.idleTimeout ?? 30 });
  return drizzle({ client, schema });
}

export type Db = ReturnType<typeof createDb>;
