/**
 * Aperçu du lien d'une page de citation (spec intervention-quotes, ADR 0030) : le
 * gabarit pré-rendu ne connaît pas la citation ; server.ts réécrit son en-tête au vol
 * (HTMLRewriter de Bun) pour les robots d'aperçu, qui n'exécutent pas le JavaScript.
 * Les valeurs sont produites par quotePageMeta, testé à part.
 */
import { APP_NAME, pageTitle } from '../config/app';
import { quotePageDescription, quotePageTitle } from '../lib/quote-meta';
import type { QuoteAt } from './quote-share';

const PATH = /^\/interventions\/([0-9a-f-]{36})\/citation\/(\d{1,5})$/;

export function quotePageParams(pathname: string): { id: string; t: number } | null {
  const match = PATH.exec(pathname);
  return match?.[1] && match[2] ? { id: match[1], t: Number(match[2]) } : null;
}

const escapeAttr = (value: string) => value.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

/** Titre, description et balises d'aperçu d'une citation ; `origin` : domaine public. */
export function quotePageMeta(quote: QuoteAt, origin: string) {
  const page = `${origin}/interventions/${quote.itemId}/citation/${quote.startS}`;
  const title = pageTitle(quotePageTitle(quote));
  const description = quotePageDescription(quote);
  const extra: [string, string, string][] = [
    ['property', 'og:url', page],
    ['property', 'og:image', `${page}/apercu.png`],
    ['property', 'og:image:width', '1200'],
    ['property', 'og:image:height', '630'],
    ['property', 'og:image:alt', `${quotePageTitle(quote)} — David Lisnard`],
    ['name', 'twitter:card', 'summary_large_image'],
    ['name', 'twitter:title', title],
    ['name', 'twitter:description', description],
    ['name', 'twitter:image', `${page}/apercu.png`],
  ];
  const tags = extra
    .map(([attr, key, value]) => `<meta ${attr}="${key}" content="${escapeAttr(value)}"/>`)
    .join('');
  return { title, description, tags };
}

/** Réécrit l'en-tête du gabarit ; toute autre réponse (erreur, autre type) est rendue telle quelle. */
export function withQuoteMeta(
  response: Response,
  meta: ReturnType<typeof quotePageMeta>,
): Response {
  if (!response.ok || !(response.headers.get('content-type') ?? '').includes('text/html'))
    return response;
  const setContent = (value: string) => ({
    element(el: { setAttribute(name: string, value: string): void }) {
      el.setAttribute('content', value);
    },
  });
  return new HTMLRewriter()
    .on('title', {
      element(el) {
        el.setInnerContent(meta.title);
      },
    })
    .on('meta[name="description"]', setContent(meta.description))
    .on('meta[property="og:title"]', setContent(meta.title))
    .on('meta[property="og:description"]', setContent(meta.description))
    .on('meta[property="og:site_name"]', setContent(APP_NAME))
    .on('head', {
      element(el) {
        el.append(meta.tags, { html: true });
      },
    })
    .transform(response);
}
