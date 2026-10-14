import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { pushClient } from './push';
import type { PushSupport } from './push-types';
import { useTRPC } from './trpc';

export interface PushAvailability {
  /** null tant que l'on ne sait pas encore (pré-rendu, chargement). */
  support: PushSupport | null;
  subscribed: boolean;
}

/**
 * L'appareil peut-il recevoir des notifications, et est-il déjà abonné ? Sert à n'afficher
 * l'entrée et l'invitation que lorsqu'elles sont utiles (spec push-notifications).
 */
export function usePushAvailability(): PushAvailability {
  const trpc = useTRPC();
  const config = useQuery(trpc.notifications.config.queryOptions());
  const [state, setState] = useState<PushAvailability>({ support: null, subscribed: false });
  const vapidPublicKey = config.data?.vapidPublicKey ?? null;
  useEffect(() => {
    if (!config.isSuccess) return;
    const support = pushClient.support(vapidPublicKey);
    let cancelled = false;
    (support === 'supported' ? pushClient.current() : Promise.resolve(null))
      .catch(() => null)
      .then((current) => !cancelled && setState({ support, subscribed: current !== null }));
    return () => {
      cancelled = true;
    };
  }, [config.isSuccess, vapidPublicKey]);
  return state;
}

/** Inviter à s'abonner : appareil compatible (ou iPhone à installer) et pas encore abonné. */
export const shouldInvite = ({ support, subscribed }: PushAvailability) =>
  !subscribed && (support === 'supported' || support === 'needs-install');
