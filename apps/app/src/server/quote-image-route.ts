/**
 * Route de l'image d'une citation (spec intervention-quotes, ADR 0029), servie par
 * server.ts. La citation est lue par l'API (`quotes.at`), appelée en interne sans
 * réseau : server.ts n'accède jamais directement à la base.
 */
import type { QuoteCardData } from './quote-card';

const PATH = /^\/interventions\/([0-9a-f-]{36})\/citation\/(\d{1,5})\/image\.png$/;
const MAX_CACHED = 200;

export function quoteImageParams(pathname: string): { id: string; t: number } | null {
  const match = PATH.exec(pathname);
  return match?.[1] && match[2] ? { id: match[1], t: Number(match[2]) } : null;
}

type Render = (data: QuoteCardData) => Promise<Uint8Array>;

interface QuoteAt {
  itemId: string;
  text: string;
  startS: number;
  theme: string | null;
  outlet: string;
  official: boolean;
  durationS: number | null;
  day: string;
}

/**
 * Crée le gestionnaire : `api` répond aux requêtes tRPC (le gestionnaire d'Expo),
 * `render` produit le PNG, `host` est l'adresse du site affichée en pied d'image (fixe,
 * jamais tirée de la requête). Cache mémoire borné, indexé par la citation lue (un texte
 * régénéré a une autre clé) ; une image en cours de calcul est partagée par les requêtes
 * simultanées.
 */
export function createQuoteImageHandler(
  api: (req: Request) => Promise<Response>,
  render: () => Promise<Render>,
) {
  const cache = new Map<string, Promise<Uint8Array>>();
  return async (req: Request, params: { id: string; t: number }, host: string) => {
    const input = encodeURIComponent(JSON.stringify(params));
    const res = await api(
      new Request(`${new URL(req.url).origin}/api/trpc/quotes.at?input=${input}`),
    );
    // Base ou API indisponible : 503, pour ne pas faire croire que la citation a disparu.
    if (!res.ok) return new Response('Image indisponible', { status: 503 });
    const quote = ((await res.json()) as { result?: { data?: QuoteAt | null } }).result?.data;
    if (!quote) return new Response('Citation introuvable', { status: 404 });
    const key = JSON.stringify([quote.itemId, quote.startS, quote.text]);
    let pending = cache.get(key);
    if (!pending) {
      pending = render().then((draw) => draw({ ...quote, host }));
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
