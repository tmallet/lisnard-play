import { Pressable, Text, View } from 'react-native';

export type RoleFilterValue = 'all' | 'national' | 'amf';

const OPTIONS: { value: RoleFilterValue; label: string }[] = [
  { value: 'all', label: 'Tout' },
  { value: 'national', label: 'National' },
  { value: 'amf', label: 'AMF' },
];

/** Filtre par rôle (spec intervention-feed) : tout, national ou AMF. */
export function RoleFilter({
  value,
  onChange,
}: {
  value: RoleFilterValue;
  onChange: (value: RoleFilterValue) => void;
}) {
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel="Filtrer par rôle"
      className="flex-row gap-2"
    >
      {OPTIONS.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            className={`rounded-full border px-4 py-1.5 ${selected ? 'border-chamois bg-chamois' : 'border-blanc/30'}`}
          >
            <Text
              className={`font-sans-semibold text-sm ${selected ? 'text-bleu-sombre' : 'text-blanc'}`}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
