import { Linking, Pressable, Text, View } from 'react-native';

import { JOIN } from '@/config/join';

/**
 * Invitation à adhérer à Nouvelle Énergie (spec app-shell, ADR 0025) : charte de l'app
 * uniquement, lien sortant sans traceur, parrainage de l'éditeur signalé.
 *
 * \`compact\` (accueil) : sur téléphone, titre et bouton sur une ligne, sans accroche, et
 * mention courte ; dès la largeur \`md\`, l'encart retrouve sa forme complète.
 */
export function JoinCta({ compact = false }: { compact?: boolean }) {
  const [before, highlight] = JOIN.title.split(/(idées)/);
  const after = JOIN.title.slice((before?.length ?? 0) + (highlight?.length ?? 0));
  return (
    <View
      className={`rounded-xl border border-chamois/40 bg-bleu/60 ${compact ? 'gap-2 p-4 md:gap-3 md:p-5' : 'gap-3 p-5'}`}
    >
      <View
        className={
          compact
            ? 'flex-row flex-wrap items-center gap-x-4 gap-y-2 md:flex-col md:items-start'
            : 'gap-3'
        }
      >
        <Text
          role="heading"
          aria-level={2}
          className={`font-sans-extrabold text-blanc uppercase tracking-wide ${compact ? 'text-base md:text-xl' : 'text-xl'}`}
        >
          {before}
          <Text className="text-chamois">{highlight}</Text>
          {after}
        </Text>
        <Text
          className={`font-sans text-base text-blanc/85 leading-relaxed ${compact ? 'hidden md:flex' : ''}`}
        >
          {JOIN.pitch}
        </Text>
        <Pressable
          accessibilityRole="link"
          accessibilityHint="Ouvre le site d’adhésion de Nouvelle Énergie"
          onPress={() => Linking.openURL(JOIN.url)}
          className={`self-start rounded-full bg-chamois active:opacity-80 ${compact ? 'px-4 py-2 md:px-5 md:py-2.5' : 'px-5 py-2.5'}`}
        >
          <Text
            className={`font-sans-bold text-bleu-sombre ${compact ? 'text-sm md:text-base' : 'text-base'}`}
          >
            {compact ? (
              <>
                <Text className="md:hidden">{JOIN.buttonShort} ↗</Text>
                <Text className="hidden md:flex">{JOIN.button} ↗</Text>
              </>
            ) : (
              `${JOIN.button} ↗`
            )}
          </Text>
        </Pressable>
      </View>
      {compact ? (
        <>
          <Text className="font-sans text-blanc/70 text-xs leading-snug md:hidden">
            {JOIN.disclosureShort}
          </Text>
          <Text className="hidden font-sans text-blanc/70 text-sm leading-snug md:flex">
            {JOIN.disclosure}
          </Text>
        </>
      ) : (
        <Text className="font-sans text-blanc/70 text-sm leading-snug">{JOIN.disclosure}</Text>
      )}
    </View>
  );
}
