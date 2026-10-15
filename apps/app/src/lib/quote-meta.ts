/**
 * Titre et description d'une page de citation, partagés par la page (PageHead, côté
 * navigateur) et par le serveur qui réécrit l'en-tête pour les robots d'aperçu
 * (ADR 0030) : les deux doivent rester identiques. Module pur, sans React Native.
 */
import { formatDate } from './format';

/** Titre de page (sans le nom du site, ajouté par pageTitle). */
export const quotePageTitle = (q: { text: string }) => `« ${q.text} »`;

/** « David Lisnard sur BFMTV, 13 octobre 2026 » : lisible hors du site (aperçus de lien). */
export const quotePageDescription = (q: { outlet: string; official: boolean; day: string }) =>
  `David Lisnard ${q.official ? 'sur sa chaîne YouTube' : `sur ${q.outlet}`}, ${formatDate(`${q.day}T12:00:00Z`)}`;
