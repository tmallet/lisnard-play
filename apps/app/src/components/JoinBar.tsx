import { Linking, Pressable, Text, View } from 'react-native';

import { JOIN } from '@/config/join';

/**
 * Invitation à adhérer en bandeau fin (accueil sur téléphone, ADR 0025) : visible sans
 * défiler, sans masquer la première vidéo. Le parrainage reste signalé.
 */
export function JoinBar() {
  return (
    <View className="gap-1 rounded-xl border border-chamois/40 bg-bleu/60 px-4 py-2.5">
      <View className="flex-row items-center justify-between gap-3">
        <Text role="heading" aria-level={2} className="flex-1 font-sans-bold text-blanc text-sm">
          {JOIN.title}
        </Text>
        <Pressable
          accessibilityRole="link"
          accessibilityHint="Ouvre le site d’adhésion de Nouvelle Énergie"
          onPress={() => Linking.openURL(JOIN.url)}
          className="rounded-full bg-chamois px-3.5 py-1.5 active:opacity-80"
        >
          <Text className="font-sans-bold text-bleu-sombre text-sm">{JOIN.buttonShort} ↗</Text>
        </Pressable>
      </View>
      <Text className="font-sans text-blanc/70 text-xs">{JOIN.disclosureShort}</Text>
    </View>
  );
}
