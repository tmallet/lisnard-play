import { listSitemapEntries, type SitemapEntries } from '@lisnard/db/read';
import type { APIRoute } from 'astro';

import { getDb } from '@/server/api';
import { publicOrigin } from '@/server/indexing';
import { sitemapXml } from '@/server/sitemap';

/**
 * Plan du site (spec app-shell), produit depuis la base. Les adresses lues sont gardées
 * dix minutes, une seule fois quel que soit le domaine (il vient des en-têtes de la
 * requête) ; la requête en cours est partagée par les appels simultanés.
 */
const CACHE_MS = 10 * 60_000;
let cached: { at: number; entries: Promise<SitemapEntries> } | null = null;

export const GET: APIRoute = async ({ request }) => {
  const db = getDb();
  if (!db) return new Response('Base de données non configurée', { status: 503 });
  if (!cached || Date.now() - cached.at >= CACHE_MS) {
    const entries = listSitemapEntries(db);
    cached = { at: Date.now(), entries };
    // Échec : rien n'est gardé, la requête suivante réessaie.
    entries.catch(() => {
      if (cached?.entries === entries) cached = null;
    });
  }
  const xml = sitemapXml(publicOrigin(request), await cached.entries);
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
