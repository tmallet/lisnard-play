import { Image, Linking, Pressable, Text, View } from 'react-native';

interface LinkCardProps {
  url: string;
  og: { title?: string; image?: string; siteName?: string; description?: string };
  fallbackTitle: string;
  outlet: string;
}

/** Carte de lien vers la source (spec intervention-media) : ouvre le site d'origine. */
export function LinkCard({ url, og, fallbackTitle, outlet }: LinkCardProps) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityHint="Ouvre la source dans le navigateur"
      onPress={() => Linking.openURL(url)}
      className="overflow-hidden rounded-xl border border-blanc/15 bg-blanc/5 active:bg-blanc/10"
    >
      {og.image ? (
        <Image
          source={{ uri: og.image }}
          className="aspect-video w-full bg-bleu"
          resizeMode="cover"
        />
      ) : null}
      <View className="gap-1 p-4">
        <Text className="font-sans-semibold text-chamois text-xs uppercase tracking-wider">
          {og.siteName ?? outlet}
        </Text>
        <Text className="font-sans-bold text-base text-blanc">{og.title ?? fallbackTitle}</Text>
        {og.description ? (
          <Text className="font-sans text-blanc/70 text-sm" numberOfLines={3}>
            {og.description}
          </Text>
        ) : null}
        <Text className="mt-1 font-sans-semibold text-chamois text-sm underline">
          Ouvrir la source ↗
        </Text>
      </View>
    </Pressable>
  );
}
