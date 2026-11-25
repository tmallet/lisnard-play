/**
 * Titre et description d'une page d'intervention, partagés par la page (PageHead, côté
 * navigateur) et par le serveur qui réécrit l'en-tête (ADR 0036) : les deux doivent
 * rester identiques. Module pur. Presse (ADR 0021) : jamais de texte d'article.
 */
import { formatDate, kindLabel } from './format';

const MAX_SUMMARY = 150;

/** Titre de page (sans le nom du site) : « Titre du média, 13 octobre 2026 ». */
export const interventionTitle = (i: { title: string; date: string }) =>
  `${i.title}, ${formatDate(i.date)}`;

const cut = (text: string) => {
  const flat = text.replace(/\s+/g, ' ').trim();
  if (flat.length <= MAX_SUMMARY) return flat;
  const head = flat.slice(0, MAX_SUMMARY - 1);
  return `${head.slice(0, head.lastIndexOf(' ') > 80 ? head.lastIndexOf(' ') : head.length)}…`;
};

/**
 * « Télévision de David Lisnard sur BFMTV, 13 octobre 2026. » puis, pour une vidéo
 * seulement, le début de son résumé ; un lien vers la presse n'a que ces métadonnées.
 */
export function interventionDescription(i: {
  outlet: string;
  kind: string | null;
  date: string;
  media: { kind: string };
  summary: { text: string } | null;
}): string {
  const lead = `${kindLabel(i.kind)} avec David Lisnard sur ${i.outlet}, ${formatDate(i.date)}.`;
  return i.media.kind === 'embed' && i.summary ? `${lead} ${cut(i.summary.text)}` : lead;
}
