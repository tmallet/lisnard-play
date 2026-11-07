import { Text, View } from 'react-native';

/**
 * Résumé d'une intervention vidéo (spec intervention-summaries, ADR 0021) : texte,
 * points clés et mention de sa génération automatique, toujours visible.
 */
export function SummaryBlock({ text, points }: { text: string; points: string[] }) {
  return (
    <View className="gap-4 rounded-[20px] border-chamois border-t-2 bg-blanc/5 p-5 md:p-6">
      <Text
        role="heading"
        aria-level={2}
        className="font-sans-bold text-chamois text-xs uppercase tracking-widest"
      >
        Résumé
      </Text>
      <View className="gap-2">
        {points.map((point, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: liste statique, points parfois identiques
          <View key={index} className="flex-row gap-2">
            <View aria-hidden className="mt-2 size-1.5 rounded-full bg-chamois" />
            <Text className="flex-1 font-sans-semibold text-blanc text-base leading-snug">
              {point}
            </Text>
          </View>
        ))}
      </View>
      {text
        .split(/\n\s*\n/)
        .filter((paragraph) => paragraph.trim())
        .map((paragraph, index) => (
          // Liste statique : l'index suffit, et deux paragraphes peuvent être identiques.
          // biome-ignore lint/suspicious/noArrayIndexKey: liste statique
          <Text key={index} className="font-sans text-base text-blanc/85 leading-relaxed">
            {paragraph.trim()}
          </Text>
        ))}
      <Text className="font-sans text-blanc/60 text-xs">Résumé généré automatiquement.</Text>
    </View>
  );
}
