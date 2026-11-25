/**
 * Données structurées et adresses des pages (spec app-shell, ADR 0036 et 0037). Module
 * pur : les pages et les tests l'utilisent sans serveur.
 */
import { APP_DESCRIPTION, APP_NAME, INDEPENDENCE_NOTICE } from '../config/app';
import { interventionDescription } from './intervention-meta';

/** JSON-LD sérialisé pour un `<script>` : `<`, `>` et `&` échappés. */
export const jsonLd = (data: unknown): string =>
  JSON.stringify(data).replace(
    /[<>&]/g,
    (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`,
  );

/** Image de repli des aperçus : l'icône de l'application. */
export const FALLBACK_IMAGE = '/icons/icon-512.png';

export const httpsOnly = (url: string | null) => (url?.startsWith('https://') ? url : null);

/** Sous-ensemble de `interventions.byId` utile aux métadonnées. */
export interface InterventionSeo {
  id: string;
  title: string;
  outlet: string;
  kind: string | null;
  date: string;
  thumbnailUrl: string | null;
  media: { kind: 'embed'; embedUrl: string } | { kind: 'link' };
  summary: { text: string; points: string[] } | null;
}

/** `VideoObject` pour une vidéo, `WebPage` pour un lien vers la presse (ADR 0036). */
export function interventionStructuredData(i: InterventionSeo, origin: string) {
  const url = `${origin}/interventions/${i.id}`;
  const description = interventionDescription(i);
  const site = { '@type': 'WebSite', name: APP_NAME, url: origin };
  const thumbnail = httpsOnly(i.thumbnailUrl);
  if (i.media.kind === 'embed')
    return {
      '@context': 'https://schema.org',
      '@type': 'VideoObject',
      name: i.title,
      description,
      url,
      uploadDate: i.date,
      ...(thumbnail ? { thumbnailUrl: [thumbnail] } : {}),
      embedUrl: i.media.embedUrl,
      inLanguage: 'fr',
      publisher: { '@type': 'Organization', name: i.outlet },
      isPartOf: site,
    };
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: i.title,
    description,
    url,
    datePublished: i.date,
    inLanguage: 'fr',
    isPartOf: site,
  };
}

/** Accueil : `WebSite` et `Organization`, avec la mention d'indépendance. */
export function homeStructuredData(origin: string) {
  const url = `${origin}/`;
  return {
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
        logo: `${origin}${FALLBACK_IMAGE}`,
      },
    ],
  };
}

/** Empreinte courte d'un texte (FNV-1a, hexadécimal) : version des images d'aperçu. */
export function fingerprint(text: string): string {
  let hash = 0x811c9dc5;
  for (const char of text) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16);
}
