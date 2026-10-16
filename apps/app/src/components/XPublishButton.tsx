import { Linking, Platform, Pressable, Text } from 'react-native';

import { xAppIntentUrl, xIntentUrl } from '@/lib/x-share';

/**
 * Rédaction X pré-remplie (ADR 0030) : texte et lien. iOS : rédaction native de l'app
 * X, sinon l'adresse web ; Android et web : l'adresse web, que l'app X ouvre elle-même.
 */
export function XPublishButton({
  text,
  url,
  label,
  accessibilityLabel,
}: {
  text: string;
  url: string;
  label: string;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={() => {
        const web = xIntentUrl(text, url);
        if (Platform.OS === 'ios')
          Linking.openURL(xAppIntentUrl(text, url)).catch(() => Linking.openURL(web));
        else Linking.openURL(web);
      }}
    >
      <Text className="font-sans-semibold text-chamois text-sm underline">{label}</Text>
    </Pressable>
  );
}
