import { Pressable, Text, View } from 'react-native';

import { THEME_LABELS, THEME_ORDER, type Theme } from '@/lib/format';

export type ThemeFilterValue = 'all' | Theme;

const OPTIONS: { value: ThemeFilterValue; label: string }[] = [
  { value: 'all', label: 'Tout' },
  ...THEME_ORDER.map((theme) => ({ value: theme, label: THEME_LABELS[theme] })),
];

/**
 * Filtre par thème (spec intervention-feed) : « Tout » puis les sept thèmes, en
 * pastilles qui passent à la ligne. Toutes restent visibles, y compris sur un
 * téléphone : une ligne défilante masquait les thèmes au-delà du bord de l'écran.
 */
export function ThemeFilter({
  value,
  onChange,
}: {
  value: ThemeFilterValue;
  onChange: (value: ThemeFilterValue) => void;
}) {
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel="Filtrer par thème"
      className="flex-row flex-wrap gap-1.5 md:gap-2"
    >
      {OPTIONS.map((option) => {
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
