import { Platform, Pressable, ScrollView, Text, View } from 'react-native';

import { THEME_LABELS, THEME_ORDER, type Theme } from '@/lib/format';

export type ThemeFilterValue = 'all' | Theme;

const OPTIONS: { value: ThemeFilterValue; label: string }[] = [
  { value: 'all', label: 'Tout' },
  ...THEME_ORDER.map((theme) => ({ value: theme, label: THEME_LABELS[theme] })),
];

/**
 * Filtre par thème (spec intervention-feed) : « Tout » puis les sept thèmes. Une ligne
 * qui défile horizontalement sur mobile, des pastilles qui passent à la ligne sur le web.
 */
export function ThemeFilter({
  value,
  onChange,
}: {
  value: ThemeFilterValue;
  onChange: (value: ThemeFilterValue) => void;
}) {
  const chips = OPTIONS.map((option) => {
    const selected = option.value === value;
    return (
      <Pressable
        key={option.value}
        accessibilityRole="radio"
        accessibilityState={{ selected }}
        onPress={() => onChange(option.value)}
        className={`rounded-full border px-4 py-1.5 ${selected ? 'border-chamois bg-chamois' : 'border-blanc/30 active:bg-blanc/10'}`}
      >
        <Text
          className={`font-sans-semibold text-sm ${selected ? 'text-bleu-sombre' : 'text-blanc'}`}
        >
          {option.label}
        </Text>
      </Pressable>
    );
  });

  if (Platform.OS === 'web')
    return (
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel="Filtrer par thème"
        className="flex-row flex-wrap gap-2"
      >
        {chips}
      </View>
    );
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityRole="radiogroup"
      accessibilityLabel="Filtrer par thème"
      // Défile jusqu.aux bords de l.écran, au-delà de la marge de Screen (px-6).
      className="-mx-6"
      contentContainerClassName="gap-2 px-6"
    >
      {chips}
    </ScrollView>
  );
}
