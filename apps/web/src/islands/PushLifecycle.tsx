import { useMutation } from '@tanstack/react-query';
import { useEffect } from 'react';

import { pushClient } from '@/lib/push';
import { ApiProvider, useTRPC } from '@/lib/trpc';

/**
 * Au chargement, reconfirme l'abonnement présent dans le navigateur (spec
 * push-notifications) : le serveur repousse sa purge à 13 mois et récupère d'éventuelles
 * nouvelles clés. Le service worker ouvre lui-même l'intervention au clic (public/sw.js).
 */
function Confirm() {
  const trpc = useTRPC();
  const { mutate } = useMutation(trpc.notifications.subscribe.mutationOptions());
  useEffect(() => {
    pushClient
      .current()
      .then((registration) => registration && mutate(registration))
      .catch(() => undefined);
  }, [mutate]);
  return null;
}

export default function PushLifecycle() {
  return (
    <ApiProvider>
      <Confirm />
    </ApiProvider>
  );
}
