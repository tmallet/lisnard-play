/**
 * Adresse de production du site (SITE_URL, lue à l'exécution) : canoniques, aperçus et
 * pied des images ne sont jamais tirés des en-têtes de la requête, qu'un client peut
 * falsifier.
 */
export function siteUrl(): URL {
  return new URL(process.env.SITE_URL ?? 'https://play.projetlisnard.fr');
}

export const siteOrigin = () => siteUrl().origin;
