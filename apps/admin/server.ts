/**
 * Service d'administration (ADR 0032) : relayé par le serveur public sous /admin, sans
 * domaine public. Variables : ADMIN_DATABASE_URL (rôle aux droits limités),
 * BETTER_AUTH_SECRET, SITE_URL (adresse publique), ADMIN_PORT (3001 par défaut).
 */
import { resolve } from 'node:path';

import { createDb } from '@lisnard/db/client';

import { createAuth } from './src/auth';
import { createAdminHandler } from './src/handler';

const required = (name: string) => {
  const value = process.env[name];
  if (!value) throw new Error(`variable manquante : ${name}`);
  return value;
};

const db = createDb(required('ADMIN_DATABASE_URL'), { max: 3, idleTimeout: 30 });
const siteUrl = process.env.SITE_URL ?? 'https://play.projetlisnard.fr';
const auth = createAuth({
  db,
  secret: required('BETTER_AUTH_SECRET'),
  baseURL: siteUrl,
  secure: siteUrl.startsWith('https://'),
});
const handle = createAdminHandler({
  db,
  auth,
  clientDir: resolve(import.meta.dir, process.env.ADMIN_CLIENT_DIR ?? 'dist'),
});

const server = Bun.serve({ port: Number(process.env.ADMIN_PORT ?? 3001), fetch: handle });
console.log(JSON.stringify({ msg: 'admin démarré', url: server.url.toString() }));
