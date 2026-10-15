import { listSitemapEntries } from '@lisnard/db/read';

import { getDb } from '@/server/db';
import { publicOrigin } from '@/server/indexing';
import { sitemapXml } from '@/server/sitemap';

/**
 * Plan du site (spec app-shell), produit depuis la base : les pages sont pré-rendues au
 * build (ADR 0011), mais les interventions arrivent chaque jour. Gardé dix minutes par
 * domaine : les moteurs ne le relisent que de loin en loin.
 */
const CACHE_MS = 10 * 60_000;
const cache = new Map<string, { at: number; xml: string }>();

export async function GET(req: Request) {
  const db = getDb();
  if (!db) return new Response('Base de données non configurée', { status: 503 });
  const origin = publicOrigin(req);
  const hit = cache.get(origin);
  let xml = hit && Date.now() - hit.at < CACHE_MS ? hit.xml : null;
  if (!xml) {
    xml = sitemapXml(origin, await listSitemapEntries(db));
    // Borne la mémoire : quelques domaines au plus (production, prévisualisation).
    if (cache.size > 20) cache.clear();
    cache.set(origin, { at: Date.now(), xml });
  }
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
