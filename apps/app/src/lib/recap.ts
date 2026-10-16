/**
 * Textes des récapitulatifs (spec campaign-recaps, ADR 0031), partagés par la page, le
 * serveur (aperçu du lien) et l'image. Module pur, sans React Native.
 */
export type RecapPeriod = 'day' | 'week';

const number = new Intl.NumberFormat('fr-FR');
/** Nombre à la française, espace ordinaire (les polices de l'image n'ont pas l'insécable fine). */
export const formatCount = (n: number) => number.format(n).replace(/\s/g, ' ');

const dayLong = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
});
const dayMonth = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
});
const dayOnly = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', timeZone: 'UTC' });
const at = (day: string) => new Date(`${day}T12:00:00Z`);

/** Premier du mois : « 1er » (Intl écrit « 1 »). */
const firstOfMonth = (day: string, text: string) =>
  day.endsWith('-01') ? text.replace(/(^|\s)1(?=\s|$)/, '$11er') : text;

/** « mardi 13 octobre » ; « du 12 au 18 octobre » ; « du 28 septembre au 4 octobre ». */
export function periodLabel(period: RecapPeriod, from: string, to: string): string {
  if (period === 'day') return firstOfMonth(from, dayLong.format(at(from)));
  const sameMonth = from.slice(0, 7) === to.slice(0, 7);
  const start = firstOfMonth(from, (sameMonth ? dayOnly : dayMonth).format(at(from)));
  return `du ${start} au ${firstOfMonth(to, dayMonth.format(at(to)))}`;
}

export const recapTitle = (period: RecapPeriod) =>
  period === 'day' ? 'La journée de David Lisnard' : 'La semaine de David Lisnard';

/** Adresse du récapitulatif : la page Campagne sur la période. */
export const recapPath = (period: RecapPeriod, from: string) =>
  `/campagne?${period === 'day' ? 'jour' : 'semaine'}=${from}`;

/** Image de l'aperçu, servie par le serveur de production (ADR 0031). */
export const recapImagePath = (period: RecapPeriod, from: string) =>
  `/campagne/recap/${period === 'day' ? 'jour' : 'semaine'}/${from}.png`;

/** « 18 interventions, +1 955 adhérents » ; sans adhésions si elles manquent. */
export function recapSummary(count: number, delta: number | null): string {
  const parts = [`${count} ${count > 1 ? 'interventions' : 'intervention'}`];
  if (delta !== null) parts.push(`${delta >= 0 ? '+' : ''}${formatCount(delta)} adhérents`);
  return parts.join(', ');
}

/** Description de l'aperçu et de la page : résumé, puis la citation mise en avant. */
export const recapDescription = (count: number, delta: number | null, quote: string | null) =>
  quote ? `${recapSummary(count, delta)}. « ${quote} »` : `${recapSummary(count, delta)}.`;

/** Message X : « Mardi 13 octobre : 18 interventions, +1 955 adhérents. » */
export function recapShareText(
  period: RecapPeriod,
  from: string,
  to: string,
  count: number,
  delta: number | null,
): string {
  const label = periodLabel(period, from, to);
  const head = period === 'day' ? label : `Semaine ${label}`;
  return `${head.charAt(0).toUpperCase()}${head.slice(1)} : ${recapSummary(count, delta)}.`;
}

/** Médias regroupés : « BFMTV ×10 », « Sa chaîne ×4 », puis « +N » au-delà de `max`. */
export function outletChips(
  outlets: { name: string; official: boolean; count: number }[],
  max = 6,
): string[] {
  const chips = outlets
    .slice(0, max)
    .map((o) => `${o.official ? 'Sa chaîne' : o.name}${o.count > 1 ? ` ×${o.count}` : ''}`);
  return outlets.length > max ? [...chips, `+${outlets.length - max}`] : chips;
}
