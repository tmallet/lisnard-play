import {
  activeFilterCount,
  FORMAT_OPTIONS,
  homeHref,
  readFilters,
  THEME_OPTIONS,
} from '../filters';

const read = (query: string) => readFilters(new URLSearchParams(query));

test('filtres lus dans l’adresse ; une valeur inconnue est ignorée', () => {
  expect(read('theme=security&format=clip')).toEqual({ theme: 'security', format: 'clip' });
  expect(read('theme=inconnu&format=podcast')).toEqual({ theme: null, format: null });
  expect(read('')).toEqual({ theme: null, format: null });
});

test('adresse : valeurs par défaut absentes, curseur des passées en option', () => {
  expect(homeHref({ theme: null, format: null })).toBe('/');
  expect(homeHref({ theme: 'security', format: 'clip' })).toBe('/?theme=security&format=clip');
  expect(homeHref({ theme: 'economy', format: null }, 'abc')).toBe('/?theme=economy&avant=abc');
});

test('options : « Tous » d’abord, sept thèmes, trois formats', () => {
  expect(THEME_OPTIONS[0]).toEqual({ value: null, label: 'Tous les thèmes' });
  expect(THEME_OPTIONS).toHaveLength(8);
  expect(FORMAT_OPTIONS.map((o) => o.label)).toEqual([
    'Tous les formats',
    'Vidéos longues',
    'Clips',
    'Presse et médias',
  ]);
  expect(activeFilterCount({ theme: 'security', format: 'clip' })).toBe(2);
});
