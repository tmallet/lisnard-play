/**
 * Envoi des notifications (spec push-notifications, ADR 0024) : Web Push signé VAPID
 * et chiffré (RFC 8291, bibliothèque web-push), et service Expo Push pour le mobile.
 * Le réseau passe par un `fetch` injecté, pour les tests.
 */

import { isPushServiceUrl } from '@lisnard/db/subscriptions';
import type { NotificationEvent } from '@lisnard/db/write';
import webpush from 'web-push';

import { errorMessage, log } from '../log';

export interface VapidConfig {
  publicKey: string;
  privateKey: string;
  /** `mailto:` ou URL https : contact pour les services push. */
  subject: string;
}

export interface PushMessage {
  title: string;
  body: string;
  /** Page ouverte au toucher de la notification. */
  url: string;
  itemId: string;
  /** Une notification plus récente sur la même intervention remplace la précédente. */
  tag: string;
  urgent: boolean;
  ttlSeconds: number;
}

const TITLE_PREFIX = { live: 'En direct', reminder: 'Dans 15 min', new_item: 'Nouveau' } as const;

export function buildMessage(event: NotificationEvent): PushMessage {
  const urgent = event.kind !== 'new_item';
  return {
    title: `${TITLE_PREFIX[event.kind]} : ${event.title}`,
    body: event.outlet,
    url: `/interventions/${event.itemId}`,
    itemId: event.itemId,
    tag: event.itemId,
    urgent,
    ttlSeconds: urgent ? 3600 : 6 * 3600,
  };
}

export interface Recipient {
  id: string;
  kind: 'web' | 'expo';
  endpoint: string;
  keys: { p256dh: string; auth: string } | null;
}

/** Résultat par destinataire : `gone` signifie que l'abonnement est à supprimer. */
export type Delivery = 'ok' | 'gone' | 'failed';

export async function sendWeb(
  recipient: Recipient,
  message: PushMessage,
  vapid: VapidConfig,
  fetchFn: typeof fetch,
): Promise<Delivery> {
  // Défense en profondeur : l'API a déjà refusé les adresses hors liste blanche.
  if (!recipient.keys || !isPushServiceUrl(recipient.endpoint)) return 'gone';
  const { endpoint, method, headers, body } = webpush.generateRequestDetails(
    { endpoint: recipient.endpoint, keys: recipient.keys },
    JSON.stringify({
      title: message.title,
      body: message.body,
      url: message.url,
      tag: message.tag,
    }),
    {
      vapidDetails: vapid,
      TTL: message.ttlSeconds,
      urgency: message.urgent ? 'high' : 'normal',
    },
  );
  const res = await fetchFn(endpoint, {
    method,
    headers: headers as Record<string, string>,
    body: new Uint8Array(body as Buffer),
    signal: AbortSignal.timeout(10_000),
  });
  if (res.ok) return 'ok';
  // 404 / 410 : abonnement expiré ou révoqué (RFC 8030).
  return res.status === 404 || res.status === 410 ? 'gone' : 'failed';
}

const EXPO_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_BATCH = 100;

interface ExpoTicket {
  status: 'ok' | 'error';
  details?: { error?: string };
}

/** Envoi par lots de 100 au service Expo ; `DeviceNotRegistered` : jeton à supprimer. */
export async function sendExpo(
  recipients: Recipient[],
  message: PushMessage,
  fetchFn: typeof fetch,
  accessToken?: string,
): Promise<Map<string, Delivery>> {
  const result = new Map<string, Delivery>();
  for (let i = 0; i < recipients.length; i += EXPO_BATCH) {
    const batch = recipients.slice(i, i + EXPO_BATCH);
    try {
      const res = await fetchFn(EXPO_URL, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json',
          ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(
          batch.map((r) => ({
            to: r.endpoint,
            title: message.title,
            body: message.body,
            data: { url: message.url, itemId: message.itemId },
            sound: 'default',
            channelId: 'interventions',
            priority: message.urgent ? 'high' : 'default',
            ttl: message.ttlSeconds,
          })),
        ),
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) throw new Error(`Expo Push : HTTP ${res.status}`);
      const tickets = ((await res.json()) as { data?: ExpoTicket[] }).data ?? [];
      for (const [j, r] of batch.entries()) {
        const t = tickets[j];
        result.set(
          r.id,
          t?.status === 'ok'
            ? 'ok'
            : t?.details?.error === 'DeviceNotRegistered'
              ? 'gone'
              : 'failed',
        );
      }
    } catch (error) {
      log.warn('notifications Expo en échec', {
        recipients: batch.length,
        error: errorMessage(error),
      });
      for (const r of batch) result.set(r.id, 'failed');
    }
  }
  return result;
}
