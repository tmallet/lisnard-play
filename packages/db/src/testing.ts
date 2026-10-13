/**
 * Bases Postgres jetables pour les tests d'intégration (design D9).
 * Chaque appel crée une base dédiée, migrée, à supprimer avec drop().
 */
import { SQL } from 'bun';

import { createDb, type Db } from './client';
import { runMigrations } from './migrate';

export const DEFAULT_TEST_URL = 'postgres://lisnard:lisnard@localhost:5433/lisnard';

export async function createTestDb(): Promise<{ db: Db; url: string; drop: () => Promise<void> }> {
  const adminUrl = process.env.DATABASE_URL ?? DEFAULT_TEST_URL;
  const name = `lisnard_test_${crypto.randomUUID().replaceAll('-', '').slice(0, 12)}`;
  const admin = new SQL(adminUrl);
  await admin.unsafe(`create database ${name}`);
  const url = new URL(adminUrl);
  url.pathname = `/${name}`;
  const db = createDb(url.toString());
  await runMigrations(db);
  return {
    db,
    url: url.toString(),
    drop: async () => {
      await db.$client.close();
      await admin.unsafe(`drop database if exists ${name} with (force)`);
      await admin.close();
    },
  };
}
