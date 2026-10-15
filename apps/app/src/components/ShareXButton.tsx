import { Linking, Platform, Pressable, Text } from 'react-native';

import { formatTimestamp } from '@/lib/format';
import { quotePath, siteOrigin } from '@/lib/site';
import { xAppUrl, xShareUrl } from '@/lib/x-share';

/**
 * « Partager sur X » (spec intervention-quotes, ADR 0030) : rédaction X pré-remplie
 * avec la citation et le lien de sa page ; l'app X s'ouvre sur mobile si elle est
 * installée.
 */
export function ShareXButton({
  itemId,
  startS,
  text,
  label = 'Partager sur X',
}: {
  itemId: string;
  startS: number;
  text: string;
  label?: string;
}) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`Partager sur X la citation à ${formatTimestamp(startS)}`}
      onPress={() => {
        const url = `${siteOrigin()}${quotePath(itemId, startS)}`;
        const web = xShareUrl(text, url);
        // App : rédaction native de X ; si X n'est pas installé, l'adresse web.
        if (Platform.OS === 'web') Linking.openURL(web);
        else Linking.openURL(xAppUrl(text, url)).catch(() => Linking.openURL(web));
      }}
    >
      <Text className="font-sans-semibold text-chamois text-sm underline">{label}</Text>
    </Pressable>
  );
}
