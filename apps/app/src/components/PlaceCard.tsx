import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { formatDate } from '@/lib/format';

/** Interventions d'un lieu sélectionné sur la carte, avec un lien vers chacune. */
export function PlaceCard({
  place,
}: {
  place: {
    label: string;
    approximate: boolean;
    interventions: { id: string; title: string; outlet: string; day: string }[];
  };
}) {
  return (
    <View className="gap-2 rounded-xl border border-blanc/15 bg-blanc/5 p-3">
      <Text className="font-sans-semibold text-chamois text-xs uppercase tracking-wider">
        {place.label}
        {place.approximate ? ' (approximatif)' : ''} · {place.interventions.length}{' '}
        {place.interventions.length > 1 ? 'interventions' : 'intervention'}
      </Text>
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
