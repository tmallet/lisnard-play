/** Formats d'affichage en français, heure de Paris. */
import type { AppRouter } from '@lisnard/api';
import type { inferRouterOutputs } from '@trpc/server';

/** Thème de campagne, inféré du contrat de l'API (spec intervention-themes). */
export type Theme =
  inferRouterOutputs<AppRouter>['interventions']['list']['items'][number]['themes'][number];

const dateFormat = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Europe/Paris',
});

const dateTimeFormat = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Paris',
});

export function formatDate(iso: string): string {
  return dateFormat.format(new Date(iso));
}

/** Date et heure, pour un direct à venir : « mardi 14 octobre à 18:00 ». */
export function formatDateTime(iso: string): string {
  return dateTimeFormat.format(new Date(iso));
}

const KIND_LABELS: Record<string, string> = {
  tv: 'Télévision',
  radio: 'Radio',
  presse: 'Presse',
  podcast: 'Podcast',
  meeting: 'Meeting',
  discours: 'Discours',
  stream: 'Vidéo',
  reseau_social: 'Réseaux sociaux',
};

export function kindLabel(kind: string | null): string {
  return (kind && KIND_LABELS[kind]) || 'Intervention';
}

/** Libellés des thèmes, dans l'ordre de la spec ; le typage impose une liste complète. */
export const THEME_LABELS: Record<Theme, string> = {
  economy: 'Économie',
  security: 'Sécurité',
  immigration: 'Immigration',
  education: 'Éducation',
  institutions: 'Institutions',
  international: 'International',
  campaign: 'Vie de campagne',
};

export const THEME_ORDER = Object.keys(THEME_LABELS) as Theme[];

/** Thèmes d'une intervention : « Économie, Sécurité », puis « +N » au-delà de max. */
export function themesLabel(themes: readonly Theme[], max = Number.POSITIVE_INFINITY): string {
  const shown = themes.slice(0, max).map((t) => THEME_LABELS[t]);
  const rest = themes.length - shown.length;
  return rest > 0 ? `${shown.join(', ')} +${rest}` : shown.join(', ');
}

/** Texte comparable : minuscules, sans accents, ponctuation ni guillemets. */
function comparable(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/**
 * Le texte ne fait que répéter le titre, éventuellement suivi du nom du média
 * (descriptions Google News, balises Open Graph) : inutile de l'afficher.
 */
export function repeatsTitle(text: string | null | undefined, title: string, outlet = ''): boolean {
  if (!text) return true;
  let t = comparable(text);
  const o = comparable(outlet);
  if (o && t.endsWith(` ${o}`)) t = t.slice(0, -o.length - 1).trim();
  const ti = comparable(title);
  return t === '' || t === o || t === ti || ti.includes(t);
}

/**
 * Miniature YouTube en 16:9 haute définition (hq720, 1280×720) au lieu de hqdefault
 * (480×360, bandes noires) ; les autres images sont renvoyées telles quelles.
 */
export function largeThumbnail(url: string): string {
  return url.replace(/^(https:\/\/i\d?\.ytimg\.com\/vi\/[^/]+\/)hqdefault\.jpg$/, '$1hq720.jpg');
}

/** Durée écoulée depuis le début d'un direct : « Commencé il y a 12 min », « … il y a 1 h 05 ». */
export function liveSince(iso: string, now: Date = new Date()): string {
  const minutes = Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / 60_000));
  if (minutes < 1) return 'Commencé à l’instant';
  if (minutes < 60) return `Commencé il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `Commencé il y a ${hours} h ${String(minutes % 60).padStart(2, '0')}`;
}

/** Ligne de date d'une intervention selon son statut temporel. */
export function whenLabel(status: 'live' | 'upcoming' | 'past', iso: string, now?: Date): string {
  if (status === 'live') return liveSince(iso, now);
  return status === 'upcoming' ? formatDateTime(iso) : formatDate(iso);
}

/** Type affiché : « Direct » pendant la diffusion, quel que soit le format. */
export function kindLabelFor(status: 'live' | 'upcoming' | 'past', kind: string | null): string {
  return status === 'live' ? 'Direct' : kindLabel(kind);
}
