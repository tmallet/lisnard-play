import { Link } from 'expo-router';
import { Image, Pressable, Text, View } from 'react-native';

import { formatDate, formatDateTime, kindLabel, type Theme, themesLabel } from '@/lib/format';

import { LiveBadge } from './LiveBadge';

export interface InterventionCardData {
  id: string;
  title: string;
  outlet: string;
  kind: string | null;
  themes: Theme[];
  status: 'live' | 'upcoming' | 'past';
  date: string;
  thumbnailUrl: string | null;
}

/** Carte d'une intervention dans les listes ; ouvre l'écran de détail. */
export function InterventionCard({ item }: { item: InterventionCardData }) {
  const when = item.status === 'upcoming' ? formatDateTime(item.date) : formatDate(item.date);
  return (
    <Link href={`/interventions/${item.id}`} asChild>
      <Pressable
        accessibilityRole="link"
        className="flex-row gap-4 rounded-xl border border-blanc/15 bg-blanc/5 p-3 active:bg-blanc/10"
      >
        {item.thumbnailUrl ? (
          <Image
            source={{ uri: item.thumbnailUrl }}
            accessibilityIgnoresInvertColors
            className="aspect-video w-28 rounded-lg bg-bleu"
            resizeMode="cover"
          />
        ) : null}
        <View className="flex-1 gap-1.5">
          {item.status === 'live' ? <LiveBadge /> : null}
          <Text className="font-sans-semibold text-chamois text-xs uppercase tracking-wider">
            {item.outlet} · {kindLabel(item.kind)}
            {item.themes.length > 0 ? ` · ${themesLabel(item.themes, 2)}` : ''}
          </Text>
          <Text className="font-sans-bold text-base text-blanc leading-snug" numberOfLines={3}>
            {item.title}
          </Text>
          <Text className="font-sans text-blanc/70 text-sm">{when}</Text>
        </View>
      </Pressable>
    </Link>
  );
}
