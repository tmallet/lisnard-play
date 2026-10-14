import { useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';

import { largeThumbnail, playerUrl, providerLabel } from '@/lib/format';

import { MediaEmbed } from './MediaEmbed';

/**
 * Clic pour charger (spec intervention-media, ADR 0022) : aucun lecteur tiers, donc aucun
 * cookie du fournisseur, avant l'action du visiteur. Ensuite, le lecteur démarre aussitôt.
 */
export function PlayerConsent({
  embedUrl,
  provider,
  title,
  posterUrl,
}: {
  embedUrl: string;
  provider: string;
  title: string;
  posterUrl: string | null;
}) {
  const [accepted, setAccepted] = useState(false);
  if (accepted) return <MediaEmbed embedUrl={playerUrl(embedUrl)} title={title} />;
  const name = providerLabel(provider);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Lire la vidéo sur ${name}`}
      onPress={() => setAccepted(true)}
      className="aspect-video w-full overflow-hidden rounded-xl bg-bleu-sombre"
    >
      {posterUrl ? (
        <Image
          source={{ uri: largeThumbnail(posterUrl) }}
          accessibilityIgnoresInvertColors
          className="absolute inset-0 h-full w-full"
          resizeMode="cover"
        />
      ) : null}
      {/* Voile bleu nuit : bouton et mention restent lisibles quelle que soit la miniature. */}
      <View className="absolute inset-0 bg-bleu-sombre/55" />
      <View className="flex-1 items-center justify-center p-4">
        <View className="flex-row items-center gap-2 rounded-full bg-chamois px-5 py-2.5">
          <Text className="font-sans-bold text-bleu-sombre text-base">▶ Lire la vidéo</Text>
        </View>
      </View>
      <View className="bg-bleu-sombre/85 px-4 py-2">
        <Text className="text-center font-sans text-blanc/85 text-xs leading-snug">
          La vidéo se charge depuis {name}, qui peut alors déposer des cookies.
        </Text>
      </View>
    </Pressable>
  );
}
