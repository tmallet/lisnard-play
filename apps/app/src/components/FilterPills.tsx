import type { AppRouter } from '@lisnard/api';
import type { inferRouterInputs } from '@trpc/server';
import { Pressable, Text, View } from 'react-native';

import { THEME_LABELS, THEME_ORDER, type Theme } from '@/lib/format';

export type ThemeFilterValue = 'all' | Theme;
type Format = NonNullable<inferRouterInputs<AppRouter>['interventions']['list']['format']>;
export type FormatFilterValue = 'all' | Format;

/** Un format ajouté côté serveur échoue ici à la compilation tant qu'il n'a pas de libellé. */
const FORMAT_LABELS: Record<Format, string> = {
  long: 'Vidéos longues',
  clip: 'Clips',
  article: 'Presse et médias',
};

export const THEME_OPTIONS: { value: ThemeFilterValue; label: string }[] = [
  { value: 'all', label: 'Tout' },
  ...THEME_ORDER.map((theme) => ({ value: theme, label: THEME_LABELS[theme] })),
];

export const FORMAT_OPTIONS: { value: FormatFilterValue; label: string }[] = [
  { value: 'all', label: 'Tout' },
  ...(Object.keys(FORMAT_LABELS) as Format[]).map((format) => ({
    value: format,
    label: FORMAT_LABELS[format],
  })),
];

/**
 * Filtre en pastilles (spec intervention-feed), par thème ou par format. Elles passent à
 * la ligne et restent toutes visibles, y compris sur un téléphone : une ligne défilante
 * masquait les options au-delà du bord de l'écran.
 */
export function FilterPills<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      className="flex-row flex-wrap gap-1.5 md:gap-2"
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            className={`rounded-full border px-2.5 py-1 md:px-4 md:py-1.5 ${selected ? 'border-chamois bg-chamois' : 'border-blanc/30 active:bg-blanc/10'}`}
          >
            <Text
              className={`font-sans-semibold text-xs md:text-sm ${selected ? 'text-bleu-sombre' : 'text-blanc'}`}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
