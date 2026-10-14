/**
 * Tâche `notify` (design D5) : repère les événements, réserve chacun avant de l'envoyer
 * (au plus un envoi), puis notifie les abonnés qui l'ont choisi.
 */
import type { Db } from '@lisnard/db/client';
import {
  claimNotification,
  deleteSubscriptionsById,
  listNotificationEvents,
  listSubscribers,
  setNotificationRecipients,
} from '@lisnard/db/write';

import { errorMessage, log } from '../log';
import { buildMessage, type Delivery, sendExpo, sendWeb, type VapidConfig } from './send';

export interface NotifyDeps {
  vapid: VapidConfig | null;
  expoAccessToken?: string;
  fetch?: typeof fetch;
}

export interface NotifyStats {
  events: number;
  sent: number;
  removed: number;
  failed: number;
}

/** Envois Web Push simultanés, par paquets. */
const WEB_CONCURRENCY = 20;

export async function notifyPending(
  db: Db,
  { vapid, expoAccessToken, fetch: fetchFn = fetch }: NotifyDeps,
): Promise<NotifyStats> {
  const stats: NotifyStats = { events: 0, sent: 0, removed: 0, failed: 0 };
  for (const event of await listNotificationEvents(db)) {
    if (!(await claimNotification(db, event.itemId, event.kind))) continue;
    stats.events += 1;
    const message = buildMessage(event);
    const subscribers = await listSubscribers(db, event.kind);
    const deliveries = new Map<string, Delivery>();

    const web = vapid ? subscribers.filter((s) => s.kind === 'web') : [];
    for (let i = 0; i < web.length; i += WEB_CONCURRENCY) {
      const batch = web.slice(i, i + WEB_CONCURRENCY);
      const results = await Promise.all(
        batch.map((s) =>
          sendWeb(s, message, vapid as VapidConfig, fetchFn).catch((error) => {
            log.warn('notification web en échec', { error: errorMessage(error) });
            return 'failed' as const;
          }),
        ),
      );
      for (const [j, s] of batch.entries()) deliveries.set(s.id, results[j] ?? 'failed');
    }
    const expo = subscribers.filter((s) => s.kind === 'expo');
    if (expo.length > 0)
      for (const [id, d] of await sendExpo(expo, message, fetchFn, expoAccessToken))
        deliveries.set(id, d);

    const gone = [...deliveries].filter(([, d]) => d === 'gone').map(([id]) => id);
    await deleteSubscriptionsById(db, gone);
    const ok = [...deliveries.values()].filter((d) => d === 'ok').length;
    await setNotificationRecipients(db, event.itemId, event.kind, ok);
    stats.sent += ok;
    stats.removed += gone.length;
    stats.failed += deliveries.size - ok - gone.length;
  }
  return stats;
}
