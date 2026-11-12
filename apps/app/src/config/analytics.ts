/**
 * Mesure d'audience Umami (ADR 0035) : web seulement, sans cookie, instance de l'éditeur.
 * Le script n'envoie rien hors du domaine de production ni si le navigateur
 * demande à ne pas être suivi (Do Not Track).
 */
export const ANALYTICS = {
  scriptUrl: 'https://umami.thimal.fr/script.js',
  websiteId: 'f9124718-8cb1-4ecd-bca8-f3c8b0bfd054',
  domains: 'play.projetlisnard.fr',
} as const;
