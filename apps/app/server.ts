/**
 * Serveur de production (ADR 0015) : sert l'export Expo (`dist/`) avec Bun.
 * Fichiers statiques depuis dist/client, pages pré-rendues et API routes via
 * l'adaptateur Bun d'expo-server. Usage : bun server.ts (PORT, défaut 3000).
 * Indexation bloquée sauf ALLOW_INDEXING=true (spec app-shell).
 */
import { join, normalize, resolve } from 'node:path';

import { createRequestHandler } from 'expo-server/adapter/bun';

import { indexingAllowed, robotsTxt, withIndexingPolicy } from './src/server/indexing';

const DIST = resolve(import.meta.dir, process.env.DIST_DIR ?? 'dist');
const CLIENT = join(DIST, 'client');
const handle = createRequestHandler({ build: join(DIST, 'server') });
const ALLOW_INDEXING = indexingAllowed(process.env.ALLOW_INDEXING);

async function staticFile(pathname: string): Promise<Response | null> {
  if (pathname === '/' || pathname.endsWith('/')) return null;
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    // Encodage invalide (« %E0%A4%A ») : pas un fichier, la suite répondra 404.
    return null;
  }
  const filePath = normalize(join(CLIENT, decoded));
  // Refuse toute sortie du dossier client (traversée de répertoires).
  if (!filePath.startsWith(`${CLIENT}/`)) return null;
  const file = Bun.file(filePath);
  if (!(await file.exists())) return null;
  const immutable = pathname.startsWith('/_expo/static/');
  return new Response(file, {
    headers: immutable ? { 'Cache-Control': 'public, max-age=31536000, immutable' } : {},
  });
}

const server = Bun.serve({
  port: Number(process.env.PORT ?? 3000),
  async fetch(req) {
    const { pathname } = new URL(req.url);
    if (pathname === '/robots.txt')
      return withIndexingPolicy(
        new Response(robotsTxt(ALLOW_INDEXING), { headers: { 'Content-Type': 'text/plain' } }),
        ALLOW_INDEXING,
      );
    return withIndexingPolicy((await staticFile(pathname)) ?? (await handle(req)), ALLOW_INDEXING);
  },
});

console.log(
  JSON.stringify({ msg: 'serveur démarré', url: server.url.toString(), indexing: ALLOW_INDEXING }),
);
