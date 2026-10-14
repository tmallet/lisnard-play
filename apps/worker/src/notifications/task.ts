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
import {
  buildMessage,
  type Delivery,
  type PushMessage,
  sendExpo,
  sendWeb,
  type VapidConfig,
} from './send';

export interface NotifyDeps {
  vapid: VapidConfig | null;
  expoAccessToken?: string;
  fetch?: typeof fetch;
}

export interface NotifyStats {
  events: number;
  /** Événements laissés en attente faute de clés VAPID. */
  deferred: number;
  sent: number;
  removed: number;
  failed: number;
}

/** Envois Web Push simultanés, par paquets. */
const WEB_CONCURRENCY = 20;

type Subscriber = Awaited<ReturnType<typeof listSubscribers>>[number];

/** Envoie un message aux abonnés donnés et supprime ceux que le service déclare expirés. */
async function deliver(
  db: Db,
  subscribers: Subscriber[],
  message: PushMessage,
  { vapid, expoAccessToken, fetch: fetchFn = fetch }: NotifyDeps,
): Promise<{ sent: number; removed: number; failed: number }> {
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
  const sent = [...deliveries.values()].filter((d) => d === 'ok').length;
  return { sent, removed: gone.length, failed: deliveries.size - sent - gone.length };
}

export async function notifyPending(db: Db, deps: NotifyDeps): Promise<NotifyStats> {
  const stats: NotifyStats = { events: 0, deferred: 0, sent: 0, removed: 0, failed: 0 };
  for (const event of await listNotificationEvents(db)) {
    const subscribers = await listSubscribers(db, event.kind);
    // Sans clés VAPID, l'événement n'est pas réservé tant que des abonnés web l'attendent :
    // il sera envoyé une fois les clés configurées (s'il reste dans la fenêtre de 2 h).
    if (!deps.vapid && subscribers.some((s) => s.kind === 'web')) {
      stats.deferred += 1;
      continue;
    }
    if (!(await claimNotification(db, event.itemId, event.kind))) continue;
    stats.events += 1;
    const result = await deliver(db, subscribers, buildMessage(event), deps);
    await setNotificationRecipients(db, event.itemId, event.kind, result.sent);
    stats.sent += result.sent;
    stats.removed += result.removed;
    stats.failed += result.failed;
  }
  return stats;
}

/**
 * Notification de test envoyée à tous les abonnés, quelles que soient leurs préférences
 * (`cli notify --test`) : vérifie la chaîne d'envoi sans attendre un événement.
 */
export function sendTestNotification(db: Db, deps: NotifyDeps) {
  return listSubscribers(db).then((subscribers) =>
    deliver(
      db,
      subscribers,
      {
        title: 'Test : les notifications fonctionnent',
        body: 'Vous serez prévenu au début du prochain direct.',
        url: '/',
        itemId: 'test',
        tag: 'test',
        urgent: true,
        ttlSeconds: 300,
      },
      deps,
    ),
  );
}
