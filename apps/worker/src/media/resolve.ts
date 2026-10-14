/**
 * Rendu média (spec intervention-media, ADR 0007, ADR 0017) : lecteur intégré via
 * oEmbed pour les fournisseurs en liste blanche, sinon carte de lien Open Graph,
 * avec repli sur un lien minimal en cas d'échec.
 */
import type { MediaRender } from '@lisnard/db/schema';

import { decodeEntities } from '../text';
import { type Resolver, safeFetchText } from './safe-fetch';

interface Provider {
  name: 'youtube' | 'dailymotion';
  matches: RegExp;
  endpoint: string;
  /** Hôtes autorisés pour l'URL du lecteur (attribut src de l'iframe). */
  playerHosts: string[];
}

const PROVIDERS: Provider[] = [
  {
    name: 'youtube',
    matches: /^https:\/\/(www\.|m\.)?(youtube\.com\/(watch\?|shorts\/|live\/)|youtu\.be\/)/,
    endpoint: 'https://www.youtube.com/oembed',
    playerHosts: ['www.youtube.com', 'www.youtube-nocookie.com'],
  },
  {
    name: 'dailymotion',
    matches: /^https:\/\/(www\.)?(dailymotion\.com\/video\/|dai\.ly\/)/,
    endpoint: 'https://www.dailymotion.com/services/oembed',
    playerHosts: ['www.dailymotion.com', 'geo.dailymotion.com'],
  },
];

/** Hôtes dont les pages ne donnent pas d'Open Graph exploitable (redirection en JavaScript). */
const NO_OPEN_GRAPH = ['news.google.com'];

export interface MediaContext {
  fetch?: typeof fetch;
  resolve?: Resolver;
}

export interface MediaTarget {
  url: string;
  title: string;
  outlet: string;
}

/** Extrait et vérifie l'URL du lecteur depuis le HTML oEmbed (le HTML n'est pas conservé). */
export function extractPlayerUrl(html: string, provider: Provider): string | null {
  const src = decodeEntities(html.match(/<iframe[^>]*\ssrc="([^"]+)"/i)?.[1] ?? '');
  if (!src) return null;
  try {
    const url = new URL(src);
    return url.protocol === 'https:' && provider.playerHosts.includes(url.hostname)
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

async function tryOEmbed(
  target: MediaTarget,
  provider: Provider,
  ctx: MediaContext,
): Promise<MediaRender | null> {
  const { status, body } = await safeFetchText(
    `${provider.endpoint}?format=json&url=${encodeURIComponent(target.url)}`,
    { ...ctx, accept: 'application/json' },
  );
  if (status !== 200) return null; // ex. intégration désactivée par l'auteur
  const data = JSON.parse(body) as { type?: string; html?: string };
  if (data.type !== 'video' && data.type !== 'rich') return null;
  const embedUrl = extractPlayerUrl(data.html ?? '', provider);
  return embedUrl ? { kind: 'embed', provider: provider.name, embedUrl } : null;
}

const meta = (html: string, property: string) => {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${property}["'][^>]*content=["']([^"']*)["']|<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${property}["']`,
    'i',
  );
  const m = html.match(re);
  const value = m?.[1] ?? m?.[2];
  return value ? decodeEntities(value).trim() : undefined;
};

async function tryOpenGraph(target: MediaTarget, ctx: MediaContext): Promise<MediaRender | null> {
  const { status, body, contentType } = await safeFetchText(target.url, {
    ...ctx,
    accept: 'text/html',
  });
  if (status !== 200 || !contentType.includes('html')) return null;
  const head = body.slice(0, body.search(/<\/head>/i) + 1 || body.length);
  const image = meta(head, 'og:image');
  const og = {
    title: meta(head, 'og:title'),
    image: image?.startsWith('https://') ? image : undefined,
    siteName: meta(head, 'og:site_name'),
    description: meta(head, 'og:description')?.slice(0, 300),
  };
  return { kind: 'link', og: Object.fromEntries(Object.entries(og).filter(([, v]) => v)) };
}

/** Lien minimal : titre et média déjà connus par la collecte (spec « Échec de la résolution »). */
export const minimalLink = (target: MediaTarget): MediaRender => ({
  kind: 'link',
  og: { title: target.title, siteName: target.outlet },
});

export async function resolveMedia(
  target: MediaTarget,
  ctx: MediaContext = {},
): Promise<MediaRender> {
  try {
    const provider = PROVIDERS.find((p) => p.matches.test(target.url));
    if (provider) return (await tryOEmbed(target, provider, ctx)) ?? minimalLink(target);
    if (NO_OPEN_GRAPH.includes(new URL(target.url).hostname)) return minimalLink(target);
    const og = await tryOpenGraph(target, ctx);
    if (!og || og.kind !== 'link') return minimalLink(target);
    return { kind: 'link', og: { title: target.title, siteName: target.outlet, ...og.og } };
  } catch {
    return minimalLink(target);
  }
}
