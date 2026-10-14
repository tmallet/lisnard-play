import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';

import { usePushConfirmation } from './usePushConfirmation';

/** Seules les pages d'intervention s'ouvrent depuis une notification. */
export function notificationTarget(
  response: Notifications.NotificationResponse | null | undefined,
) {
  const url = response?.notification.request.content.data?.url;
  return typeof url === 'string' && /^\/interventions\/[\w-]+$/.test(url) ? url : null;
}

/** Mobile : reconfirme l'abonnement et ouvre l'intervention touchée dans une notification. */
export function PushLifecycle() {
  usePushConfirmation();
  const response = Notifications.useLastNotificationResponse();
  useEffect(() => {
    const target = notificationTarget(response);
    if (!target) return;
    router.push(target as `/interventions/${string}`);
    void Notifications.clearLastNotificationResponseAsync();
  }, [response]);
  return null;
}
