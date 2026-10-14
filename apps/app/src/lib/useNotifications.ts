import { useMutation, useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';

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

  const setPreference = async (key: keyof Preferences, value: boolean) => {
    if (state.status !== 'on') return;
    const preferences = { ...state.preferences, [key]: value };
    setState({ ...state, preferences });
    try {
      setState({
        ...state,
        preferences: await update.mutateAsync({ endpoint: state.endpoint, preferences }),
      });
    } catch {
      setState(state);
    }
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

  const busy = subscribe.isPending || update.isPending || unsubscribe.isPending;
  return { state, busy, enable, setPreference, disable };
}
