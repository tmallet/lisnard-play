import { Text, View } from 'react-native';

/**
 * Résumé d'une intervention vidéo (spec intervention-summaries, ADR 0021) : texte,
 * points clés et mention de sa génération automatique, toujours visible.
 */
export function SummaryBlock({ text, points }: { text: string; points: string[] }) {
  return (
    <View className="gap-3 rounded-xl border border-blanc/15 bg-blanc/5 p-4">
      <Text
        role="heading"
        aria-level={2}
        className="font-sans-semibold text-chamois text-xs uppercase tracking-wider"
      >
        Résumé
      </Text>
      {text
        .split(/\n\s*\n/)
        .filter((paragraph) => paragraph.trim())
        .map((paragraph) => (
          <Text key={paragraph} className="font-sans text-base text-blanc leading-relaxed">
            {paragraph.trim()}
          </Text>
        ))}
      <View className="gap-1.5">
        {points.map((point) => (
          <View key={point} className="flex-row gap-2">
            <Text aria-hidden className="font-sans-bold text-chamois">
              ·
            </Text>
            <Text className="flex-1 font-sans-semibold text-blanc/85 text-sm">{point}</Text>
          </View>
        ))}
      </View>
      <Text className="font-sans text-blanc/60 text-xs">Résumé généré automatiquement.</Text>
    </View>
  );
}
