/**
 * Source RSS générique (podcasts, Google News). Les liens Google News ne se résolvent
 * pas par simple redirection HTTP : l'URL Google News est conservée et le média réel
 * est lu dans la balise <source> de chaque élément.
 */
import { XMLParser } from 'fast-xml-parser';

import { decodeEntities, sha256, stripHtml } from '../text';
import type { Candidate, RssSourceConfig, SourceContext } from './types';

const xml = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@',
  processEntities: false,
});

function asArray<T>(value: T | T[] | undefined): T[] {
  return value === undefined ? [] : Array.isArray(value) ? value : [value];
}

function text(value: unknown): string {
  if (typeof value === 'string') return decodeEntities(value);
  if (typeof value === 'number') return String(value);
  if (value && typeof value === 'object' && '#text' in value)
    return text((value as { '#text': unknown })['#text']);
  return '';
}

/** Retire le suffixe « - Média » qu'ajoute Google News au titre. */
function stripOutletSuffix(title: string, outlet: string): string {
  const suffix = ` - ${outlet}`;
  return outlet && title.endsWith(suffix) ? title.slice(0, -suffix.length) : title;
}

export async function parseRss(body: string, source: RssSourceConfig): Promise<Candidate[]> {
  const doc = xml.parse(body) as { rss?: { channel?: { item?: unknown } } };
  const items = asArray(
    doc.rss?.channel?.item as Record<string, unknown>[] | Record<string, unknown> | undefined,
  );
  const candidates: Candidate[] = [];
  for (const it of items) {
    const link = text(it.link).trim();
    const published = new Date(text(it.pubDate));
    if (!link.startsWith('http') || Number.isNaN(published.getTime())) continue;
    const outlet = source.outletFromItem ? text(it.source).trim() || null : null;
    const guid = text(it.guid).trim();
    const enclosure = it.enclosure as { '@url'?: string } | undefined;
    candidates.push({
      platformId: `rss:${(await sha256(guid || link)).slice(0, 24)}`,
      url: link,
      outlet,
      title: stripOutletSuffix(stripHtml(text(it.title)), outlet ?? ''),
      description: stripHtml(text(it.description) || text(it['itunes:summary'])),
      publishedAt: published,
      thumbnailUrl: enclosure?.['@url']?.match(/\.(jpe?g|png|webp)(\?|$)/i)
        ? enclosure['@url']
        : null,
    });
  }
  return candidates;
}

export async function collectRss(
  source: RssSourceConfig,
  ctx: SourceContext,
): Promise<Candidate[]> {
  const res = await ctx.fetch(source.url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (lisnard-play worker)' },
  });
  if (!res.ok) throw new Error(`flux RSS ${source.id} : HTTP ${res.status}`);
  return parseRss(await res.text(), source);
}
