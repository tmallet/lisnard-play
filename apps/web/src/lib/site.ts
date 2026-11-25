/**
 * Adresses publiques du site (spec intervention-quotes, campaign-recaps). Module pur,
 * utilisable par les pages, les îlots et le serveur.
 */

/** Adresse de la page d'une citation (ADR 0028). */
export const quotePath = (itemId: string, startS: number) =>
  `/interventions/${itemId}/citation/${startS}`;

/** Image carrée de partage d'une citation (ADR 0029). */
export const quoteImagePath = (itemId: string, startS: number) =>
  `${quotePath(itemId, startS)}/image.png`;

/** Origine de la page dans le navigateur, sinon l'adresse de production. */
export function browserOrigin(): string {
  return typeof window !== 'undefined' ? window.location.origin : 'https://play.projetlisnard.fr';
}
