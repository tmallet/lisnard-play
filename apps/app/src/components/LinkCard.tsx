import { Image, Linking, Pressable, Text, View } from 'react-native';

import { repeatsTitle } from '@/lib/format';

interface LinkCardProps {
  url: string;
  og: { title?: string; image?: string; siteName?: string; description?: string };
  outlet: string;
  /** Textes déjà affichés par l'écran (titre, description) : la carte ne les répète pas. */
  shownTexts: string[];
}

/**
 * Carte de lien vers la source (spec intervention-media) : ouvre le site d'origine.
 * Elle n'affiche le titre et la description Open Graph que s'ils apportent autre
 * chose que l'écran ; sinon elle se réduit au média et au lien.
 */
export function LinkCard({ url, og, outlet, shownTexts }: LinkCardProps) {
  const site = og.siteName ?? outlet;
  const isNew = (text: string | undefined): text is string =>
    !!text && shownTexts.every((shown) => !repeatsTitle(text, shown, site));
  const title = isNew(og.title) ? og.title : null;
  const description = isNew(og.description) ? og.description : null;

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
          {site}
        </Text>
        {title ? <Text className="font-sans-bold text-base text-blanc">{title}</Text> : null}
        {description ? (
          <Text className="font-sans text-blanc/70 text-sm" numberOfLines={3}>
            {description}
          </Text>
        ) : null}
        <Text className="mt-1 font-sans-semibold text-chamois text-sm underline">
          Ouvrir la source ↗
        </Text>
      </View>
    </Pressable>
  );
}
