import { Text, View } from 'react-native';

/** Indicateur « en direct » : émeraude de la charte (spec intervention-feed). */
export function LiveBadge() {
  return (
    <View
      accessibilityLabel="En direct"
      className="flex-row items-center gap-1.5 self-start rounded-full bg-emeraude px-2.5 py-1"
    >
      <View className="size-2 rounded-full bg-bleu-sombre" />
      <Text className="font-sans-bold text-bleu-sombre text-xs uppercase tracking-wider">
        En direct
      </Text>
    </View>
  );
}
