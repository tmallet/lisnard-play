import { join } from 'node:path';

import { migrate } from 'drizzle-orm/bun-sql/migrator';

import type { Db } from './client';

/**
 * Applique les migrations en attente (idempotent). Appelé au démarrage du worker (ADR 0015).
 * MIGRATIONS_DIR permet de pointer vers les migrations copiées dans l'image Docker,
 * le worker y étant empaqueté en un seul fichier.
 */
export async function runMigrations(db: Db): Promise<void> {
  const migrationsFolder = process.env.MIGRATIONS_DIR ?? join(import.meta.dir, '..', 'drizzle');
  await migrate(db, { migrationsFolder });
}
