import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { colors } from '@/theme/colors';

import type { PushClient } from './push-types';

/** Canal Android des notifications (doit exister avant la demande d'autorisation). */
export const ANDROID_CHANNEL = 'interventions';

/** Projet EAS : sans lui, pas de jeton Expo Push (option masquée, ADR 0024). */
function projectId(): string | null {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? null;
}

async function token(): Promise<string> {
  const id = projectId();
  if (!id) throw new Error('Projet EAS absent');
  return (await Notifications.getExpoPushTokenAsync({ projectId: id })).data;
}

/** Notification reçue app ouverte : affichée comme en arrière-plan. */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** Expo Push (ADR 0024), via expo-notifications. */
export const pushClient: PushClient = {
  support() {
    return Device.isDevice && projectId() ? 'supported' : 'unconfigured';
  },

  async current() {
    if (!projectId() || (await Notifications.getPermissionsAsync()).status !== 'granted')
      return null;
    return { kind: 'expo', endpoint: await token() };
  },

  async register() {
    if (Platform.OS === 'android')
      await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL, {
        name: 'Interventions',
        importance: Notifications.AndroidImportance.HIGH,
        lightColor: colors.chamois,
      });
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return 'denied';
    return { kind: 'expo', endpoint: await token() };
  },

  // Le serveur oublie le jeton ; l'autorisation système reste du ressort des réglages.
  async unregister() {},

  // Sur mobile, l'état n'est connu qu'en asynchrone : l'écran gère le refus.
  blocked() {
    return false;
  },
};
