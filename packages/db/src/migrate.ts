import { join } from 'node:path';

import { migrate } from 'drizzle-orm/bun-sql/migrator';

import type { Db } from './client';

/** Applique les migrations en attente (idempotent). Appelé au démarrage du worker (ADR 0015). */
export async function runMigrations(db: Db): Promise<void> {
  await migrate(db, { migrationsFolder: join(import.meta.dir, '..', 'drizzle') });
}
