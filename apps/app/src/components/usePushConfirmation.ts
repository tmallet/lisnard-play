import { useMutation } from '@tanstack/react-query';
import { useEffect } from 'react';

import { pushClient } from '@/lib/push';
import { useTRPC } from '@/lib/trpc';

/**
 * Au démarrage, reconfirme l'abonnement présent sur l'appareil (spec push-notifications) :
 * le serveur repousse sa purge à 13 mois et récupère d'éventuelles nouvelles clés.
 */
export function usePushConfirmation() {
  const trpc = useTRPC();
  const { mutate } = useMutation(trpc.notifications.subscribe.mutationOptions());
  useEffect(() => {
    pushClient
      .current()
      .then((registration) => registration && mutate(registration))
      .catch(() => undefined);
  }, [mutate]);
}
