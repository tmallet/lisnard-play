import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { formatDate } from '@/lib/format';

/** Fiche d'un lieu choisi sur la carte : ses interventions, avec un lien vers chacune. */
export function PlaceCard({
  place,
  onClose,
}: {
  onClose: () => void;
  place: {
    label: string;
    approximate: boolean;
    interventions: { id: string; title: string; outlet: string; day: string }[];
  };
}) {
  return (
    <View className="gap-2 rounded-xl border border-blanc/25 bg-bleu-sombre p-3 shadow-lg">
      <View className="flex-row items-start gap-2">
        <Text className="flex-1 font-sans-semibold text-chamois text-xs uppercase tracking-wider">
          {place.label}
          {place.approximate ? ' (approximatif)' : ''} · {place.interventions.length}{' '}
          {place.interventions.length > 1 ? 'interventions' : 'intervention'}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fermer"
          onPress={onClose}
          hitSlop={8}
        >
          <Text className="font-sans-bold text-blanc/80 text-base leading-none">×</Text>
        </Pressable>
      </View>
      {place.interventions.map((item) => (
        <View key={item.id} className="gap-0.5">
          <Text className="font-sans text-blanc/70 text-xs">
            {formatDate(`${item.day}T12:00:00Z`)} · {item.outlet}
          </Text>
          <Link href={`/interventions/${item.id}`} asChild>
            <Pressable accessibilityRole="link">
              <Text className="font-sans-semibold text-chamois text-sm underline">
                {item.title}
              </Text>
            </Pressable>
          </Link>
        </View>
      ))}
    </View>
  );
}
