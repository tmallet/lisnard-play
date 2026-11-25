/**
 * Filtres de l'accueil (spec intervention-feed) : options, lecture de l'adresse et liens.
 * Les filtres vivent dans l'adresse (`theme`, `format`) : ils fonctionnent sans
 * JavaScript et une vue filtrée se partage. Module pur.
 */
import type { AppRouter } from '@lisnard/api';
import type { inferRouterInputs } from '@trpc/server';

import { THEME_LABELS, THEME_ORDER, type Theme } from './format';

export type Format = NonNullable<inferRouterInputs<AppRouter>['interventions']['list']['format']>;

/** Un format ajouté côté serveur échoue ici à la compilation tant qu'il n'a pas de libellé. */
const FORMAT_LABELS: Record<Format, string> = {
  long: 'Vidéos longues',
  clip: 'Clips',
  article: 'Presse et médias',
};

export const THEME_OPTIONS: { value: Theme | null; label: string }[] = [
  { value: null, label: 'Tous les thèmes' },
  ...THEME_ORDER.map((theme) => ({ value: theme, label: THEME_LABELS[theme] })),
];

export const FORMAT_OPTIONS: { value: Format | null; label: string }[] = [
  { value: null, label: 'Tous les formats' },
  ...(Object.keys(FORMAT_LABELS) as Format[]).map((format) => ({
    value: format,
    label: FORMAT_LABELS[format],
  })),
];

export interface HomeFilters {
  theme: Theme | null;
  format: Format | null;
}

/** Filtres lus dans l'adresse ; une valeur inconnue est ignorée. */
export function readFilters(params: URLSearchParams): HomeFilters {
  const theme = params.get('theme');
  const format = params.get('format');
  return {
    theme: THEME_ORDER.includes(theme as Theme) ? (theme as Theme) : null,
    format: format && format in FORMAT_LABELS ? (format as Format) : null,
  };
}

/**
 * Adresse de l'accueil avec ces filtres et, éventuellement, la page des passées à partir
 * du curseur `avant`. Les valeurs par défaut n'apparaissent jamais dans l'adresse.
 */
export function homeHref(filters: HomeFilters, before?: string | null): string {
  const params = new URLSearchParams();
  if (filters.theme) params.set('theme', filters.theme);
  if (filters.format) params.set('format', filters.format);
  if (before) params.set('avant', before);
  const query = params.toString();
  return query ? `/?${query}` : '/';
}

export const activeFilterCount = (f: HomeFilters) => (f.theme ? 1 : 0) + (f.format ? 1 : 0);
