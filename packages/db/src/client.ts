import { SQL } from 'bun';
import { drizzle } from 'drizzle-orm/bun-sql';

import * as schema from './schema';

/** Client Drizzle sur le client Postgres intégré à Bun (ADR 0014). */
export function createDb(url = process.env.DATABASE_URL) {
  if (!url) throw new Error('DATABASE_URL est requis.');
  const client = new SQL(url);
  return drizzle({ client, schema });
}

export type Db = ReturnType<typeof createDb>;
