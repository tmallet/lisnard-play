/**
 * Source unique de l'identité de l'application (spec app-shell).
 * Le nom est provisoire (ADR 0001, point ouvert) : le changer ici le propage
 * à l'en-tête, à « À propos », aux titres de page et aux balises Open Graph.
 */
export const APP_NAME = 'Lisnard Play';

export const APP_DESCRIPTION =
  'Toutes les interventions publiques de David Lisnard, candidat à l’élection présidentielle 2027 : en direct, à venir et passées.';

export const INDEPENDENCE_NOTICE =
  'Application indépendante, non affiliée à David Lisnard ni à Nouvelle Énergie.';

export const SOURCES_NOTICE =
  'Les contenus référencés proviennent exclusivement de sources publiques (chaînes vidéo, médias, podcasts). Ils sont intégrés quand la plateforme le permet, sinon un lien renvoie vers la source.';

export const CONTACT = {
  label: 'Signaler une erreur ou nous écrire',
  url: 'https://github.com/tmallet/lisnard-play/issues',
} as const;

/** Titre de page web : « Page · Nom » ou le nom seul. */
export function pageTitle(page?: string): string {
  return page ? `${page} · ${APP_NAME}` : APP_NAME;
}
