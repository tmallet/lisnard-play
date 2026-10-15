/**
 * Route des images d'une citation (spec intervention-quotes, ADR 0029 et 0030), servie
 * par server.ts : carré (`image.png`, « Partager en image ») et paysage (`apercu.png`,
 * aperçus de lien).
 */
import type { CardFormat, QuoteCardData } from './quote-card';
import { type Api, readQuote } from './quote-share';

const PATH = /^\/interventions\/([0-9a-f-]{36})\/citation\/(\d{1,5})\/(image|apercu)\.png$/;
const MAX_CACHED = 200;

export interface ImageParams {
  id: string;
  t: number;
  format: CardFormat;
}

export function quoteImageParams(pathname: string): ImageParams | null {
  const match = PATH.exec(pathname);
  if (!match?.[1] || !match[2]) return null;
  return {
    id: match[1],
    t: Number(match[2]),
    format: match[3] === 'apercu' ? 'landscape' : 'square',
  };
}

type Render = (data: QuoteCardData, format: CardFormat) => Promise<Uint8Array>;

/**
 * Crée le gestionnaire : `api` répond aux requêtes tRPC (le gestionnaire d'Expo),
 * `render` produit le PNG, `host` est l'adresse du site affichée en pied d'image (fixe,
 * jamais tirée de la requête). Cache mémoire borné, indexé par la citation lue et le
 * format (un texte régénéré a une autre clé) ; une image en cours de calcul est partagée
 * par les requêtes simultanées.
 */
export function createQuoteImageHandler(api: Api, render: () => Promise<Render>) {
  const cache = new Map<string, Promise<Uint8Array>>();
  return async (req: Request, params: ImageParams, host: string) => {
    const quote = await readQuote(api, req, params);
    // Base ou API indisponible : 503, pour ne pas faire croire que la citation a disparu.
    if (quote === 'error') return new Response('Image indisponible', { status: 503 });
    if (!quote) return new Response('Citation introuvable', { status: 404 });
    const key = JSON.stringify([quote.itemId, quote.startS, quote.text, params.format]);
    let pending = cache.get(key);
    if (!pending) {
      pending = render().then((draw) => draw({ ...quote, host }, params.format));
      if (cache.size >= MAX_CACHED) cache.delete(cache.keys().next().value as string);
      cache.set(key, pending);
      // Échec : rien n'est gardé, la requête suivante réessaie.
      pending.catch(() => cache.delete(key));
    }
    const png = await pending;
    return new Response(png as Uint8Array<ArrayBuffer>, {
      headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400' },
    });
  };
}
