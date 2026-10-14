import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { shouldInvite, usePushAvailability } from '@/lib/usePushAvailability';

/**
 * Invitation à s'abonner, affichée à la place de la section « En direct » quand aucun
 * direct n'est en cours (spec push-notifications). Rien si l'appareil est déjà abonné ou
 * ne peut pas recevoir de notifications.
 */
export function NotifyInvite() {
  const availability = usePushAvailability();
  if (!shouldInvite(availability)) return null;
  return (
    <View className="flex-row flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-blanc/15 px-4 py-3">
      <Text className="font-sans text-base text-blanc/85">Aucun direct en ce moment.</Text>
      <Link href="/notifications" asChild>
        <Pressable accessibilityRole="link">
          <Text className="font-sans-semibold text-base text-chamois underline">
            Être prévenu du prochain
          </Text>
        </Pressable>
      </Link>
    </View>
  );
}
