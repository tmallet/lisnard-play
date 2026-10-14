import { Link } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';

import {
  formatDate,
  formatDateTime,
  kindLabel,
  largeThumbnail,
  type Theme,
  themesLabel,
} from '@/lib/format';

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

/** Image à la une : version haute définition, repli sur l'image d'origine si elle manque. */
function CardImage({ url }: { url: string }) {
  const [uri, setUri] = useState(() => largeThumbnail(url));
  return (
    <Image
      source={{ uri }}
      onError={() => setUri(url)}
      accessibilityIgnoresInvertColors
      className="aspect-video w-full bg-bleu"
      resizeMode="cover"
    />
  );
}

/**
 * Carte d'une intervention dans les listes ; ouvre l'écran de détail. Avec une image,
 * celle-ci occupe toute la largeur en tête de carte, badge « en direct » par-dessus.
 */
export function InterventionCard({ item }: { item: InterventionCardData }) {
  const when = item.status === 'upcoming' ? formatDateTime(item.date) : formatDate(item.date);
  const live = item.status === 'live' ? <LiveBadge /> : null;
  return (
    <Link href={`/interventions/${item.id}`} asChild>
      <Pressable
        accessibilityRole="link"
        className="overflow-hidden rounded-xl border border-blanc/15 bg-blanc/5 active:bg-blanc/10"
      >
        {item.thumbnailUrl ? (
          <View>
            <CardImage url={item.thumbnailUrl} />
            {live ? <View className="absolute top-3 left-3">{live}</View> : null}
          </View>
        ) : null}
        <View className="gap-1.5 p-4">
          {item.thumbnailUrl ? null : live}
          <Text className="font-sans-semibold text-chamois text-xs uppercase tracking-wider">
            {item.outlet} · {kindLabel(item.kind)}
            {item.themes.length > 0 ? ` · ${themesLabel(item.themes, 2)}` : ''}
          </Text>
          <Text className="font-sans-bold text-lg text-blanc leading-snug" numberOfLines={3}>
            {item.title}
          </Text>
          <Text className="font-sans text-blanc/70 text-sm">{when}</Text>
        </View>
      </Pressable>
    </Link>
  );
}
