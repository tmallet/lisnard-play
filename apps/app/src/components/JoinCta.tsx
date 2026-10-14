import { Linking, Pressable, Text, View } from 'react-native';

import { JOIN } from '@/config/join';

/**
 * Invitation à adhérer à Nouvelle Énergie (spec app-shell, ADR 0025) : charte de l'app
 * uniquement, lien sortant sans traceur, parrainage de l'éditeur signalé.
 */
export function JoinCta() {
  const [before, highlight] = JOIN.title.split(/(idées)/);
  return (
    <View className="gap-3 rounded-xl border border-chamois/40 bg-bleu/60 p-5">
      <Text
        role="heading"
        aria-level={2}
        className="font-sans-extrabold text-blanc text-xl uppercase tracking-wide"
      >
        {before}
        <Text className="text-chamois">{highlight}</Text>
        {JOIN.title.slice((before?.length ?? 0) + (highlight?.length ?? 0))}
      </Text>
      <Text className="font-sans text-base text-blanc/85 leading-relaxed">{JOIN.pitch}</Text>
      <Pressable
        accessibilityRole="link"
        accessibilityHint="Ouvre le site d’adhésion de Nouvelle Énergie"
        onPress={() => Linking.openURL(JOIN.url)}
        className="self-start rounded-full bg-chamois px-5 py-2.5 active:opacity-80"
      >
        <Text className="font-sans-bold text-base text-bleu-sombre">{JOIN.button} ↗</Text>
      </Pressable>
      <Text className="font-sans text-blanc/70 text-sm leading-snug">{JOIN.disclosure}</Text>
    </View>
  );
}
