/**
 * Géométrie du graphique des adhésions (spec membership-timeline, design D4) : échelles,
 * tracé de la courbe et position des repères. Fonctions pures, testées à part.
 */

/**
 * Largeur d'un jour : un rond par jour sans chevauchement avec ses voisins ; la période
 * défile horizontalement plutôt que de se tasser.
 */
export const DAY_PX = 24;
export const OFFICIAL_SIZE = 22;
export const DOT_SIZE = 10;
/** Repères visibles par jour ; au-delà, un repère « +N » ouvre la liste du jour. */
export const MAX_STACK = 5;
const GAP = 2;
/** Hauteur de la zone de la courbe, sous les repères empilés. */
export const PLOT_HEIGHT = 220;
export const AXIS_HEIGHT = 24;
const SIDE = 16;

export interface Day {
  day: string;
  members: number;
}

export interface TimelineIntervention {
  id: string;
  day: string;
  title: string;
  outlet: string;
  thumbnailUrl: string | null;
  official: boolean;
  live: boolean;
}

interface MarkerBase {
  /** Centre du repère. */
  x: number;
  y: number;
  size: number;
  day: string;
  /** Total d'adhérents ce jour-là. */
  members: number;
}

/** Une intervention, ou le regroupement « +N » des interventions en trop d'un jour chargé. */
export type Marker =
  | (MarkerBase & { type: 'item'; key: string; item: TimelineIntervention })
  | (MarkerBase & { type: 'more'; key: string; items: TimelineIntervention[] });

export interface Layout {
  width: number;
  height: number;
  /** Tracé SVG de la courbe et de l'aire sous elle. */
  line: string;
  area: string;
  ticks: { value: number; y: number; label: string }[];
  months: { x: number; label: string }[];
  markers: Marker[];
}

/** Pas « rond » (1, 2, 5 × 10ⁿ) pour environ cinq graduations. */
function niceStep(range: number): number {
  const raw = Math.max(range, 1) / 5;
  const power = 10 ** Math.floor(Math.log10(raw));
  const unit = [1, 2, 5, 10].find((u) => u * power >= raw) ?? 10;
  return unit * power;
}

const shortNumber = new Intl.NumberFormat('fr-FR', {
  notation: 'compact',
  maximumFractionDigits: 1,
});
const fullNumber = new Intl.NumberFormat('fr-FR');
const monthFormat = new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' });

export const markerSize = (item: TimelineIntervention) =>
  item.official && item.thumbnailUrl ? OFFICIAL_SIZE : DOT_SIZE;

/** Miniature YouTube en petite taille (120 px), suffisante pour un rond de 24 px. */
export function smallThumbnail(url: string): string {
  return url.replace(
    /^(https:\/\/i\d?\.ytimg\.com\/vi\/[^/]+\/)(?:hq|mq|sd|maxres)?default\.jpg$/,
    '$1default.jpg',
  );
}

export function layoutTimeline(
  days: Day[],
  interventions: TimelineIntervention[],
  minWidth: number,
): Layout | null {
  if (days.length === 0) return null;
  const index = new Map(days.map((d, i) => [d.day, i]));
  /** Jour de la courbe d'une intervention : le sien, sinon le plus proche avant. */
  const dayIndexOf = (day: string) => {
    const exact = index.get(day);
    if (exact !== undefined) return exact;
    let found = -1;
    for (const [i, d] of days.entries()) if (d.day <= day) found = i;
    return found;
  };

  // Empilement : par jour, dans l'ordre chronologique, le plus récent en haut.
  const stacks = new Map<number, TimelineIntervention[]>();
  for (const item of interventions) {
    const i = dayIndexOf(item.day);
    if (i < 0) continue;
    stacks.set(i, [...(stacks.get(i) ?? []), item]);
  }
  /**
   * Repères affichés pour un jour : les vidéos officielles d'abord, puis les autres,
   * dans l'ordre chronologique ; au-delà de MAX_STACK, le reste rejoint « +N ».
   */
  const visible = (items: TimelineIntervention[]) => {
    if (items.length <= MAX_STACK) return { shown: items, rest: [] };
    const ordered = [...items.filter((i) => i.official), ...items.filter((i) => !i.official)];
    const shown = ordered.slice(0, MAX_STACK - 1);
    return {
      shown: items.filter((i) => shown.includes(i)),
      rest: items.filter((i) => !shown.includes(i)),
    };
  };
  const stackHeight = (items: TimelineIntervention[]) => {
    const { shown, rest } = visible(items);
    return (
      shown.reduce((h, it) => h + markerSize(it) + GAP, 0) + (rest.length ? OFFICIAL_SIZE + GAP : 0)
    );
  };
  const top = Math.max(OFFICIAL_SIZE, ...[...stacks.values()].map(stackHeight)) + 4;

  const members = days.map((d) => d.members);
  const step = niceStep(Math.max(...members) - Math.min(...members));
  const yMin = Math.floor(Math.min(...members) / step) * step;
  // Série plate (total inchangé) : au moins un pas de hauteur, sinon division par zéro.
  const yMax = Math.max(Math.ceil(Math.max(...members) / step) * step, yMin + step);
  const height = top + PLOT_HEIGHT + AXIS_HEIGHT;
  const width = Math.max(minWidth, (days.length - 1) * DAY_PX + 2 * SIDE);
  const dx = days.length > 1 ? (width - 2 * SIDE) / (days.length - 1) : 0;
  const x = (i: number) => SIDE + i * dx;
  const y = (m: number) => top + PLOT_HEIGHT - ((m - yMin) / (yMax - yMin)) * PLOT_HEIGHT;

  const points = days.map((d, i) => `${x(i).toFixed(1)},${y(d.members).toFixed(1)}`);
  const line = `M${points.join(' L')}`;
  const bottom = (top + PLOT_HEIGHT).toFixed(1);
  const area = `${line} L${x(days.length - 1).toFixed(1)},${bottom} L${x(0).toFixed(1)},${bottom} Z`;

  const ticks: Layout['ticks'] = [];
  // Libellé compact (« 60 k ») seulement si le pas le permet, sinon le nombre exact :
  // deux graduations voisines ne doivent jamais afficher la même valeur.
  const tickLabel = (m: number) => (step >= 1000 ? shortNumber.format(m) : fullNumber.format(m));
  for (let m = yMin; m <= yMax; m += step) ticks.push({ value: m, y: y(m), label: tickLabel(m) });

  const months = days.flatMap((d, i) =>
    i === 0 || d.day.endsWith('-01')
      ? [{ x: x(i), label: monthFormat.format(new Date(`${d.day}T00:00:00Z`)) }]
      : [],
  );

  const markers: Marker[] = [];
  for (const [i, items] of stacks) {
    const day = days[i] as Day;
    const base = { x: x(i), day: day.day, members: day.members };
    const { shown, rest } = visible(items);
    let offset = 0;
    for (const item of shown) {
      const size = markerSize(item);
      markers.push({
        ...base,
        type: 'item',
        key: item.id,
        item,
        size,
        y: y(day.members) - offset - size / 2,
      });
      offset += size + GAP;
    }
    if (rest.length > 0)
      markers.push({
        ...base,
        type: 'more',
        key: `more-${day.day}`,
        items: rest,
        size: OFFICIAL_SIZE,
        y: y(day.members) - offset - OFFICIAL_SIZE / 2,
      });
  }
  return { width, height, line, area, ticks, months, markers };
}
