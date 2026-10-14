import { Link } from 'expo-router';
import { Pressable, Text } from 'react-native';

import { usePushAvailability } from '@/lib/usePushAvailability';

/**
 * Mobile : accès aux réglages de notification depuis l'accueil, la barre d'onglets native
 * n'ayant pas d'en-tête. Masqué tant que l'appareil ne peut pas en recevoir (ADR 0024).
 */
export function NotificationsEntry() {
  const { support } = usePushAvailability();
  if (support !== 'supported') return null;
  return (
    <Link href="/notifications" asChild>
      <Pressable accessibilityRole="link" className="self-start">
        <Text className="font-sans-semibold text-base text-chamois underline">Notifications</Text>
      </Pressable>
    </Link>
  );
}
