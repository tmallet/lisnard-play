/**
 * Mentions légales (spec app-shell, ADR 0022). L'éditeur, particulier, reste anonyme :
 * ses coordonnées sont communiquées à l'hébergeur (LCEN, article 6-III-2).
 * Changer d'hébergeur impose de mettre ce fichier à jour.
 */
export const LEGAL = {
  contactEmail: 'lisnardplay@tmallet.fr',
  /**
   * Prestataire d'hébergement (contrat) : OneProvider. Le serveur dédié est situé en
   * France, dans un centre de données Scaleway (adresse IP du réseau Scaleway, Paris).
   */
  host: {
    name: 'OneProvider (BrainStorm Network Inc.)',
    address: '3275 avenue Francis-Hughes, Laval (Québec) H7L 5A5, Canada',
    phone: '+1 514 286-0253',
    url: 'https://oneprovider.com',
    datacenter: 'un centre de données de Scaleway SAS à Paris',
  },
  updatedAt: '14 octobre 2026',
  googlePrivacyUrl: 'https://policies.google.com/privacy',
} as const;
