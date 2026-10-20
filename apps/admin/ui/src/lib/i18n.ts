import type { I18nProvider } from '@refinedev/core';

/** Libellés français des composants Refine UI (clés de traduction de Refine). */
const FR: Record<string, string> = {
  'buttons.apply': 'Appliquer',
  'buttons.clear': 'Effacer',
  'table.filter.combobox.noResults': 'Aucun résultat.',
  'table.filter.combobox.placeholder': 'Choisir…',
  'table.filter.combobox.search': 'Rechercher…',
  'table.filter.numeric.placeholder': 'Filtrer par…',
  'table.filter.text.placeholder': 'Filtrer par…',
  'table.filter.operator.noResults': 'Aucun opérateur.',
  'table.filter.operator.placeholder': 'Rechercher un opérateur…',
  'table.filter.operator.eq': 'Égal à',
  'table.filter.operator.contains': 'Contient',
};

export const i18nProvider: I18nProvider = {
  translate: (key, _options, defaultMessage) => FR[key] ?? defaultMessage ?? key,
  changeLocale: () => Promise.resolve(),
  getLocale: () => 'fr',
};
