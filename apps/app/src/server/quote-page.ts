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

/** Empreinte courte d'un texte (FNV-1a, hexadécimal). */
export function fingerprint(text: string): string {
  let hash = 0x811c9dc5;
  for (const char of text) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16);
}

export interface PageMeta {
  title: string;
  description: string;
  tags: string;
}

/** Balises d'aperçu d'une page (ADR 0030) ; image paysage 1200 × 630. */
export function previewMeta(p: {
  url: string;
  image: string;
  title: string;
  description: string;
  alt: string;
}): PageMeta {
  const { url: page, image, title, description } = p;
  const extra: [string, string, string][] = [
    ['property', 'og:url', page],
    ['property', 'og:image', image],
    ['property', 'og:image:width', '1200'],
    ['property', 'og:image:height', '630'],
    ['property', 'og:image:alt', p.alt],
    ['name', 'twitter:card', 'summary_large_image'],
    ['name', 'twitter:title', title],
    ['name', 'twitter:description', description],
    ['name', 'twitter:image', image],
  ];
  const tags = extra
    .map(([attr, key, value]) => `<meta ${attr}="${key}" content="${escapeAttr(value)}"/>`)
    .join('');
  return { title, description, tags };
}

/** Titre, description et balises d'aperçu d'une citation ; `origin` : domaine public. */
export function quotePageMeta(quote: QuoteAt, origin: string): PageMeta {
  const page = `${origin}/interventions/${quote.itemId}/citation/${quote.startS}`;
  return previewMeta({
    url: page,
    // Adresse de l'image versionnée par le texte : les services d'aperçu (Slack, X)
    // gardent en cache une image, même ratée ; une citation régénérée ou un échec passé
    // ne collent pas à la nouvelle image.
    image: `${page}/apercu.png?v=${fingerprint(quote.text)}`,
    title: pageTitle(quotePageTitle(quote)),
    description: quotePageDescription(quote),
    alt: `${quotePageTitle(quote)} — David Lisnard`,
  });
}

/**
 * Réécrit l'en-tête du gabarit ; toute autre réponse (erreur, autre type) est rendue
 * telle quelle. Les balises d'aperçu et l'encodage sont placés en tête : certains robots
 * ne lisent que le début de la page, et le gabarit porte d'abord une grande feuille de
 * style.
 */
export function withPageMeta(response: Response, meta: PageMeta): Response {
  if (!response.ok || !(response.headers.get('content-type') ?? '').includes('text/html'))
    return response;
  const setContent = (value: string) => ({
    element(el: { setAttribute(name: string, value: string): void }) {
      el.setAttribute('content', value);
    },
  });
  const rewritten = new HTMLRewriter()
    .on('meta[charset]', {
      element(el) {
        el.remove();
      },
    })
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
        el.prepend(`<meta charset="utf-8"/>${meta.tags}`, { html: true });
      },
    })
    .transform(response);
  const headers = new Headers(rewritten.headers);
  headers.set('Content-Type', 'text/html; charset=utf-8');
  return new Response(rewritten.body, { status: rewritten.status, headers });
}
