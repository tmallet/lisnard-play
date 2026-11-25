/**
 * Métadonnées des pages d'intervention et de l'accueil pour les moteurs de recherche et
 * les robots d'aperçu, qui n'exécutent pas le JavaScript (spec app-shell, ADR 0036) :
 * server.ts réécrit l'en-tête du gabarit pré-rendu (même technique que l'ADR 0030).
 * Presse (ADR 0021) : seules des métadonnées (titre, média, date), jamais de texte d'article.
 */
import { APP_DESCRIPTION, APP_NAME, INDEPENDENCE_NOTICE, pageTitle } from '../config/app';
import { interventionDescription, interventionTitle } from '../lib/intervention-meta';
import { escapeAttr, jsonLdScript, type PageMeta } from './quote-page';
import type { Api } from './quote-share';

const PATH = /^\/interventions\/([0-9a-f-]{36})\/?$/;

export function interventionPageParams(pathname: string): { id: string } | null {
  const match = PATH.exec(pathname);
  return match?.[1] ? { id: match[1] } : null;
}

/** Sous-ensemble de `interventions.byId` utilisé ici (contrat tRPC, lu sans réseau). */
export interface InterventionAt {
  id: string;
  title: string;
  outlet: string;
  kind: string | null;
  status: string;
  date: string;
  thumbnailUrl: string | null;
  media: { kind: 'embed'; embedUrl: string } | { kind: 'link' };
  summary: { text: string; points: string[] } | null;
}

/** L'intervention, `null` si elle est introuvable (404 tRPC), `'error'` si l'API a échoué. */
export async function readIntervention(
  api: Api,
  req: Request,
  params: { id: string },
): Promise<InterventionAt | null | 'error'> {
  const query = encodeURIComponent(JSON.stringify({ id: params.id }));
  const res = await api(
    new Request(`${new URL(req.url).origin}/api/trpc/interventions.byId?input=${query}`),
  );
  if (res.status === 404) return null;
  if (!res.ok) return 'error';
  return ((await res.json()) as { result?: { data?: InterventionAt } }).result?.data ?? null;
}

const https = (url: string | null) => (url?.startsWith('https://') ? url : null);

/** Image d'aperçu : la miniature de la vidéo, sinon l'icône de l'application. */
const FALLBACK_IMAGE = '/icons/icon-512.png';

const metaTags = (entries: [string, string, string][]) =>
  entries
    .map(([attr, key, value]) => `<meta ${attr}="${key}" content="${escapeAttr(value)}"/>`)
    .join('');

const canonicalTag = (url: string) => `<link rel="canonical" href="${escapeAttr(url)}"/>`;

/** Titre, description, balises, JSON-LD et texte visible sans JavaScript d'une intervention. */
export function interventionPageMeta(i: InterventionAt, origin: string): PageMeta {
  const url = `${origin}/interventions/${i.id}`;
  const title = pageTitle(interventionTitle(i));
  const description = interventionDescription(i);
  const thumbnail = https(i.thumbnailUrl);
  const image = thumbnail ?? `${origin}${FALLBACK_IMAGE}`;
  const video = i.media.kind === 'embed';
  const tags = [
    canonicalTag(url),
    metaTags([
      ['property', 'og:url', url],
      ['property', 'og:image', image],
      ['name', 'twitter:card', thumbnail ? 'summary_large_image' : 'summary'],
      ['name', 'twitter:title', title],
      ['name', 'twitter:description', description],
      ['name', 'twitter:image', image],
    ]),
    jsonLdScript(
      video
        ? {
            '@context': 'https://schema.org',
            '@type': 'VideoObject',
            name: i.title,
            description,
            url,
            uploadDate: i.date,
            ...(thumbnail ? { thumbnailUrl: [thumbnail] } : {}),
            embedUrl: (i.media as { embedUrl: string }).embedUrl,
            inLanguage: 'fr',
            publisher: { '@type': 'Organization', name: i.outlet },
            isPartOf: { '@type': 'WebSite', name: APP_NAME, url: origin },
          }
        : {
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: i.title,
            description,
            url,
            datePublished: i.date,
            inLanguage: 'fr',
            isPartOf: { '@type': 'WebSite', name: APP_NAME, url: origin },
          },
    ),
  ].join('');
  const points = (i.summary?.points ?? []).map((point) => `<li>${escapeAttr(point)}</li>`).join('');
  const body =
    `<article><h1>${escapeAttr(i.title)}</h1><p>${escapeAttr(description)}</p>` +
    // Résumé des vidéos seulement (ADR 0021) : une intervention en lien n'en a pas.
    (video && i.summary ? `<p>${escapeAttr(i.summary.text)}</p>` : '') +
    (video && points ? `<ul>${points}</ul>` : '') +
    `<p><a href="${escapeAttr(origin)}/">Toutes les interventions de David Lisnard</a></p></article>`;
  return { title, description, tags, ogType: video ? 'video.other' : 'article', body };
}

/** Accueil : adresse canonique, carte Twitter, image et données structurées du site. */
export function homePageMeta(origin: string): PageMeta {
  const url = `${origin}/`;
  const title = pageTitle();
  const image = `${origin}${FALLBACK_IMAGE}`;
  const tags = [
    canonicalTag(url),
    metaTags([
      ['property', 'og:url', url],
      ['property', 'og:image', image],
      ['name', 'twitter:card', 'summary'],
      ['name', 'twitter:title', title],
      ['name', 'twitter:description', APP_DESCRIPTION],
      ['name', 'twitter:image', image],
    ]),
    jsonLdScript({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebSite',
          '@id': `${url}#website`,
          name: APP_NAME,
          url,
          description: APP_DESCRIPTION,
          inLanguage: 'fr',
          publisher: { '@id': `${url}#organization` },
        },
        {
          '@type': 'Organization',
          '@id': `${url}#organization`,
          name: APP_NAME,
          url,
          description: INDEPENDENCE_NOTICE,
          logo: image,
        },
      ],
    }),
  ].join('');
  return { title, description: APP_DESCRIPTION, tags };
}
