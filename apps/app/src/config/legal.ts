/**
 * Mentions légales (spec app-shell, ADR 0022). L'éditeur, particulier, reste anonyme :
 * ses coordonnées sont communiquées à l'hébergeur (LCEN, article 6-III-2).
 * Changer d'hébergeur impose de mettre ce fichier à jour.
 */
export const LEGAL = {
  contactEmail: 'lisnardplay@tmallet.fr',
  host: {
    name: 'Scaleway SAS',
    address: '8 rue de la Ville-l’Évêque, 75008 Paris, France',
    url: 'https://www.scaleway.com',
  },
  updatedAt: '14 octobre 2026',
  googlePrivacyUrl: 'https://policies.google.com/privacy',
} as const;
