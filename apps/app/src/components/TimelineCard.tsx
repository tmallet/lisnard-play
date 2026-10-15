import { Link } from 'expo-router';
import { Image, Pressable, Text, View } from 'react-native';

import { formatDate, largeThumbnail } from '@/lib/format';
import type { Marker, TimelineIntervention } from '@/lib/timeline';

const members = new Intl.NumberFormat('fr-FR');

function InterventionLink({ id, label }: { id: string; label: string }) {
  return (
    <Link href={`/interventions/${id}`} asChild>
      <Pressable accessibilityRole="link">
        <Text className="font-sans-semibold text-chamois text-sm underline">{label}</Text>
      </Pressable>
    </Link>
  );
}

function meta(item: TimelineIntervention) {
  return `${item.outlet}${item.live ? ' · direct' : ''}`;
}

/**
 * Repère sélectionné sur le graphique : l'intervention, ou la liste des interventions
 * regroupées dans « +N », avec le total d'adhérents ce jour-là.
 */
export function TimelineCard({ marker }: { marker: Marker }) {
  const day = `${formatDate(`${marker.day}T12:00:00Z`)} · ${members.format(marker.members)} adhérents ce jour-là`;
  if (marker.type === 'more')
    return (
      <View className="gap-2 rounded-xl border border-blanc/15 bg-blanc/5 p-3">
        <Text className="font-sans-semibold text-chamois text-xs uppercase tracking-wider">
          {day}
        </Text>
        {marker.items.map((item) => (
          <View key={item.id} className="gap-0.5">
            <Text className="font-sans text-blanc/70 text-xs">{meta(item)}</Text>
            <InterventionLink id={item.id} label={item.title} />
          </View>
        ))}
      </View>
    );
  const { item } = marker;
  return (
    <View className="flex-row gap-3 rounded-xl border border-blanc/15 bg-blanc/5 p-3">
      {item.thumbnailUrl ? (
        <Image
          source={{ uri: largeThumbnail(item.thumbnailUrl) }}
          accessibilityIgnoresInvertColors
          className="aspect-video w-28 rounded-lg bg-bleu"
          resizeMode="cover"
        />
      ) : null}
      <View className="flex-1 gap-1">
        <Text className="font-sans-semibold text-chamois text-xs uppercase tracking-wider">
          {meta(item)}
        </Text>
        <Text className="font-sans-bold text-base text-blanc leading-snug" numberOfLines={2}>
          {item.title}
        </Text>
        <Text className="font-sans text-blanc/70 text-sm">{day}</Text>
        <InterventionLink id={item.id} label="Voir l’intervention" />
      </View>
    </View>
  );
}
