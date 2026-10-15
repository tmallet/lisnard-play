import { listSitemapEntries, type SitemapEntries } from '@lisnard/db/read';

import { getDb } from '@/server/db';
import { publicOrigin } from '@/server/indexing';
import { sitemapXml } from '@/server/sitemap';

/**
 * Plan du site (spec app-shell), produit depuis la base : les pages sont pré-rendues au
 * build (ADR 0011), mais les interventions arrivent chaque jour. Les adresses lues sont
 * gardées dix minutes, une seule fois quel que soit le domaine (il vient des en-têtes de
 * la requête) ; la requête en cours est partagée par les appels simultanés.
 */
const CACHE_MS = 10 * 60_000;
let cached: { at: number; entries: Promise<SitemapEntries> } | null = null;

export async function GET(req: Request) {
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
  const xml = sitemapXml(publicOrigin(req), await cached.entries);
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
