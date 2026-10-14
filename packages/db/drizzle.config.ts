import { defineConfig } from 'drizzle-kit';

// Migrations SQL versionnées dans ./drizzle (ADR 0014). Studio : bun run db:studio
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://lisnard:lisnard@localhost:5433/lisnard',
  },
});
