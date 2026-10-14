import { useMutation, useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

import { pushClient } from './push';
import type { PushRegistration, PushSupport } from './push-types';
import { useTRPC } from './trpc';

export interface Preferences {
  live: boolean;
  reminder: boolean;
  newItem: boolean;
}

export type NotificationState =
  | { status: 'loading' }
  | { status: 'unavailable'; support: Exclude<PushSupport, 'supported'> }
  | { status: 'off' }
  | { status: 'denied' }
  | { status: 'on'; endpoint: string; preferences: Preferences }
  | { status: 'error' };

/**
 * État et actions de l'écran des notifications (spec push-notifications). L'abonnement
 * présent sur l'appareil est reconfirmé à l'ouverture, ce qui repousse sa purge.
 */
export function useNotifications() {
  const trpc = useTRPC();
  const config = useQuery(trpc.notifications.config.queryOptions());
  const subscribe = useMutation(trpc.notifications.subscribe.mutationOptions());
  const update = useMutation(trpc.notifications.update.mutationOptions());
  const unsubscribe = useMutation(trpc.notifications.unsubscribe.mutationOptions());
  const [state, setState] = useState<NotificationState>({ status: 'loading' });
  const vapidPublicKey = config.data?.vapidPublicKey ?? null;
  const { mutateAsync: save } = subscribe;

  const confirm = useCallback(
    async (registration: PushRegistration) => {
      const preferences = await save(registration);
      setState({ status: 'on', endpoint: registration.endpoint, preferences });
    },
    [save],
  );

  useEffect(() => {
    if (config.isPending) return;
    if (config.isError) return setState({ status: 'error' });
    const support = pushClient.support(vapidPublicKey);
    if (support !== 'supported') return setState({ status: 'unavailable', support });
    let cancelled = false;
    pushClient
      .current()
      .then((existing) => {
        if (cancelled) return;
        if (existing) return confirm(existing);
        setState({ status: 'off' });
      })
      .catch(() => !cancelled && setState({ status: 'error' }));
    return () => {
      cancelled = true;
    };
  }, [config.isPending, config.isError, vapidPublicKey, confirm]);

  const enable = async () => {
    try {
      const registration = await pushClient.register(vapidPublicKey);
      if (registration === 'denied') return setState({ status: 'denied' });
      await confirm(registration);
    } catch {
      setState({ status: 'error' });
    }
  };

  // Préférences les plus récentes et file des mises à jour : deux bascules rapides
  // s'appliquent l'une après l'autre, sans qu'une requête périmée écrase la suivante.
  const latest = useRef<Preferences | null>(null);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  if (state.status === 'on' && latest.current === null) latest.current = state.preferences;
  if (state.status !== 'on') latest.current = null;

  const setPreference = (key: keyof Preferences, value: boolean) => {
    if (state.status !== 'on' || !latest.current) return;
    const { endpoint } = state;
    const preferences = { ...latest.current, [key]: value };
    latest.current = preferences;
    setState({ status: 'on', endpoint, preferences });
    queue.current = queue.current
      .then(() => update.mutateAsync({ endpoint, preferences }))
      .catch(() => {
        // Échec : on revient à l'état du serveur au prochain affichage de l'écran.
        setState({ status: 'error' });
      });
  };

  const disable = async () => {
    if (state.status !== 'on') return;
    try {
      // Un abonnement déjà supprimé côté serveur (purge) n'empêche pas la désactivation.
      await unsubscribe.mutateAsync({ endpoint: state.endpoint }).catch(() => undefined);
      await pushClient.unregister();
      setState({ status: 'off' });
    } catch {
      setState({ status: 'error' });
    }
  };

  // Les interrupteurs restent actifs pendant une mise à jour (file ci-dessus).
  const busy = subscribe.isPending || unsubscribe.isPending;
  return { state, busy, enable, setPreference, disable };
}
