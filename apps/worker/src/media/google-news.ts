/**
 * Liens Google News (spec intervention-media, « Liens d'agrégateur », ADR 0021) : les
 * flux RSS ne donnent qu'une redirection opaque. L'URL de l'éditeur s'obtient en deux
 * appels, comme le fait la page de Google News elle-même :
 * 1. la page de l'article porte une signature (data-n-a-sg) et un horodatage (data-n-a-ts) ;
 * 2. le point d'accès batchexecute (méthode Fbv4je) les échange contre l'URL de l'éditeur.
 * Point d'accès non documenté : tout échec renvoie null (repli sur le lien minimal).
 */
import { type SafeFetchOptions, safeFetchText } from './safe-fetch';

const ARTICLE_URL = /^https:\/\/news\.google\.com\/(?:rss\/)?articles\/([A-Za-z0-9_-]+)/;
const BATCH_URL = 'https://news.google.com/_/DotsSplashUi/data/batchexecute';

export function isGoogleNewsUrl(url: string): boolean {
  return ARTICLE_URL.test(url);
}

/** Requête batchexecute (format observé le 2026-10-13). */
export function buildDecodeRequest(id: string, timestamp: number, signature: string): string {
  const payload = [
    'garturlreq',
    [
      [
        'X',
        'X',
        ['X', 'X'],
        null,
        null,
        1,
        1,
        'US:en',
        null,
        1,
        null,
        null,
        null,
        null,
        null,
        0,
        1,
      ],
      'X',
      'X',
      1,
      [1, 1, 1],
      1,
      1,
      null,
      0,
      0,
      null,
      0,
    ],
    id,
    timestamp,
    signature,
  ];
  const req = [[['Fbv4je', JSON.stringify(payload), null, 'generic']]];
  return `f.req=${encodeURIComponent(JSON.stringify(req))}`;
}

/** Première URL d'éditeur de la réponse : https, hors des domaines Google. */
export function extractPublisherUrl(body: string): string | null {
  for (const raw of body.match(/https:\/\/[^"\\\s]+/g) ?? []) {
    try {
      const url = new URL(raw);
      if (!/(^|\.)google(\.[a-z]+)+$|(^|\.)gstatic\.com$/.test(url.hostname)) return url.toString();
    } catch {}
  }
  return null;
}

export async function decodeGoogleNewsUrl(
  url: string,
  options: Pick<SafeFetchOptions, 'fetch' | 'resolve'> = {},
): Promise<string | null> {
  const id = url.match(ARTICLE_URL)?.[1];
  if (!id) return null;
  try {
    const page = await safeFetchText(`https://news.google.com/rss/articles/${id}`, {
      ...options,
      accept: 'text/html',
    });
    const signature = page.body.match(/data-n-a-sg="([^"]+)"/)?.[1];
    const timestamp = Number(page.body.match(/data-n-a-ts="(\d+)"/)?.[1]);
    if (page.status !== 200 || !signature || !timestamp) return null;
    const res = await safeFetchText(BATCH_URL, {
      ...options,
      post: {
        body: buildDecodeRequest(id, timestamp, signature),
        contentType: 'application/x-www-form-urlencoded;charset=UTF-8',
      },
    });
    return res.status === 200 ? extractPublisherUrl(res.body) : null;
  } catch {
    return null;
  }
}
