import identity from './identity.json';

/**
 * Identité de l'application (spec app-shell).
 * Le nom vit dans identity.json, seule source lue aussi par app.config.ts (nom natif).
 * Il est provisoire (ADR 0001, point ouvert) : le changer là le propage à l'en-tête,
 * à « À propos », aux titres de page, aux balises Open Graph et au nom de l'app installée.
 */
export const APP_NAME: string = identity.name;

export const APP_DESCRIPTION =
  'Toutes les interventions publiques de David Lisnard, candidat à l’élection présidentielle 2027 : en direct, à venir et passées.';

export const INDEPENDENCE_NOTICE =
  'Initiative indépendante de soutiens. Ce site ne dépend ni de Nouvelle Énergie ni de David Lisnard.';

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
