/**
 * Serveur de production (ADR 0015) : sert l'export Expo (`dist/`) avec Bun.
 * Fichiers statiques depuis dist/client, pages pré-rendues et API routes via
 * l'adaptateur Bun d'expo-server. Usage : bun server.ts (PORT, défaut 3000).
 * Indexation bloquée sauf ALLOW_INDEXING=true (spec app-shell). Images de partage des
 * citations (ADR 0029), produites ici : leur module natif ne passe pas par Metro.
 * En-tête des pages de citation réécrit pour les aperçus de lien (ADR 0030).
 */
import { join, normalize, resolve } from 'node:path';

import { createRequestHandler } from 'expo-server/adapter/bun';

import {
  indexingAllowed,
  publicOrigin,
  robotsTxt,
  withIndexingPolicy,
} from './src/server/indexing';
import { createQuoteImageHandler, quoteImageParams } from './src/server/quote-image-route';
import { quotePageMeta, quotePageParams, withQuoteMeta } from './src/server/quote-page';
import { readQuote } from './src/server/quote-share';

const DIST = resolve(import.meta.dir, process.env.DIST_DIR ?? 'dist');
const CLIENT = join(DIST, 'client');
const handle = createRequestHandler({ build: join(DIST, 'server') });
const ALLOW_INDEXING = indexingAllowed(process.env.ALLOW_INDEXING);
// Adresse du site en pied des images partagées : celle de la production, jamais celle
// annoncée par la requête (un en-tête falsifié ne doit ni l'afficher ni vider le cache).
const SITE_URL = new URL(process.env.EXPO_PUBLIC_SITE_URL ?? 'https://play.projetlisnard.fr');
const SITE_HOST = SITE_URL.host;
// Module d'image chargé à la première image : un échec (binaire absent) n'empêche pas
// le site de démarrer, seule l'image répond 503.
const quoteImage = createQuoteImageHandler(handle, async () => {
  const { renderQuoteImage } = await import('./src/server/quote-image');
  return renderQuoteImage;
});

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
        new Response(robotsTxt(ALLOW_INDEXING, publicOrigin(req)), {
          headers: { 'Content-Type': 'text/plain' },
        }),
        ALLOW_INDEXING,
      );
    const image = quoteImageParams(pathname);
    if (image)
      return withIndexingPolicy(
        await quoteImage(req, image, SITE_HOST).catch((error) => {
          console.error(
            JSON.stringify({ msg: 'image de citation en échec', error: String(error) }),
          );
          return new Response('Image indisponible', { status: 503 });
        }),
        ALLOW_INDEXING,
      );
    const page = quotePageParams(pathname);
    if (page) {
      // Citation introuvable ou API en erreur : gabarit inchangé (métadonnées génériques).
      // Lecture de la citation et rendu du gabarit en parallèle. Adresses de l'aperçu sur
      // le domaine de production, jamais tirées des en-têtes de la requête.
      const [quote, response] = await Promise.all([
        readQuote(handle, req, page).catch(() => null),
        handle(req),
      ]);
      return withIndexingPolicy(
        quote && quote !== 'error'
          ? withQuoteMeta(response, quotePageMeta(quote, SITE_URL.origin))
          : response,
        ALLOW_INDEXING,
      );
    }
    return withIndexingPolicy((await staticFile(pathname)) ?? (await handle(req)), ALLOW_INDEXING);
  },
});

console.log(
  JSON.stringify({ msg: 'serveur démarré', url: server.url.toString(), indexing: ALLOW_INDEXING }),
);
