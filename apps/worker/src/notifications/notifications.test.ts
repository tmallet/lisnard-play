import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import { createECDH, randomBytes } from 'node:crypto';

import type { Db } from '@lisnard/db/client';
import { item, notificationSent, pushSubscription } from '@lisnard/db/schema';
import { saveSubscription } from '@lisnard/db/subscriptions';
import { createTestDb } from '@lisnard/db/testing';
import { setMedia, upsertItem, upsertSources } from '@lisnard/db/write';
import { eq, sql } from 'drizzle-orm';
import webpush from 'web-push';

import { parseNotify } from '../config';
import { buildMessage } from './send';
import { notifyPending } from './task';

const vapidKeys = webpush.generateVAPIDKeys();
const vapid = { ...vapidKeys, subject: 'mailto:test@example.test' };

/** Clés d'un vrai navigateur simulé : le chiffrement RFC 8291 doit aboutir. */
function browserKeys() {
  const ecdh = createECDH('prime256v1');
  ecdh.generateKeys();
  return { p256dh: ecdh.getPublicKey('base64url'), auth: randomBytes(16).toString('base64url') };
}

interface Call {
  url: string;
  headers: Record<string, string>;
  body: unknown;
}

/** Services push simulés : statut par adresse, et tickets Expo. */
function pushServices(status: Record<string, number> = {}, expoErrors: string[] = []) {
  const calls: Call[] = [];
  const fetchFn = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    const headers = (init?.headers ?? {}) as Record<string, string>;
    if (url.startsWith('https://exp.host/')) {
      const messages = JSON.parse(String(init?.body)) as { to: string }[];
      calls.push({ url, headers, body: messages });
      return Response.json({
        data: messages.map((m) =>
          expoErrors.includes(m.to)
            ? { status: 'error', details: { error: 'DeviceNotRegistered' } }
            : { status: 'ok', id: 'ticket' },
        ),
      });
    }
    calls.push({ url, headers, body: init?.body });
    return new Response(null, { status: status[url] ?? 201 });
  }) as typeof fetch;
  return { calls, fetchFn };
}

let db: Db;
let drop: () => Promise<void>;
beforeAll(async () => {
  ({ db, drop } = await createTestDb());
  await upsertSources(db, [{ id: 'yt:dl', kind: 'youtube', name: 'David Lisnard', active: true }]);
});
afterAll(() => drop());
beforeEach(async () => {
  await db.execute(sql`truncate ${item}, ${pushSubscription} cascade`);
});

async function publish(id: string, over: Partial<Parameters<typeof upsertItem>[1]> = {}) {
  const { id: itemId } = await upsertItem(db, {
    sourceId: 'yt:dl',
    platformId: `yt:${id}`,
    url: `https://www.youtube.com/watch?v=${id}`,
    title: id,
    description: '',
    publishedAt: new Date(),
    ...over,
  });
  await db.update(item).set({ status: 'published' }).where(eq(item.id, itemId));
  await setMedia(db, itemId, { kind: 'embed', provider: 'youtube', embedUrl: 'https://x' });
  return itemId;
}

const WEB_A = 'https://fcm.googleapis.com/fcm/send/a';
const WEB_B = 'https://updates.push.services.mozilla.com/wpush/v2/b';
const EXPO = 'ExponentPushToken[abcdefghijklmnop]';

describe('notify', () => {
  test('direct : envoyé une fois à chaque abonné, chiffré et signé', async () => {
    await saveSubscription(db, { kind: 'web', endpoint: WEB_A, keys: browserKeys() });
    await saveSubscription(db, { kind: 'expo', endpoint: EXPO });
    const id = await publish('Meeting', { liveStatus: 'live', startsAt: new Date() });
    const { calls, fetchFn } = pushServices();

    expect(await notifyPending(db, { vapid, fetch: fetchFn })).toEqual({
      events: 1,
      sent: 2,
      removed: 0,
      failed: 0,
    });
    const web = calls.find((c) => c.url === WEB_A);
    expect(web?.headers.Authorization).toStartWith('vapid t=');
    expect(web?.headers['Content-Encoding']).toBe('aes128gcm');
    expect(web?.headers.Urgency).toBe('high');
    const expo = calls.find((c) => c.url.startsWith('https://exp.host/'));
    expect(expo?.body).toMatchObject([
      { to: EXPO, title: 'En direct : Meeting', data: { url: `/interventions/${id}` } },
    ]);

    // Second passage : rien à envoyer.
    expect((await notifyPending(db, { vapid, fetch: fetchFn })).events).toBe(0);
    const [sent] = await db.select().from(notificationSent);
    expect(sent?.recipients).toBe(2);
  });

  test('préférences respectées : la nouvelle intervention ne va qu’aux volontaires', async () => {
    await saveSubscription(db, { kind: 'web', endpoint: WEB_A, keys: browserKeys() });
    await saveSubscription(db, {
      kind: 'web',
      endpoint: WEB_B,
      keys: browserKeys(),
      preferences: { live: true, reminder: true, newItem: true },
    });
    await publish('Interview');
    const { calls, fetchFn } = pushServices();
    await notifyPending(db, { vapid, fetch: fetchFn });
    expect(calls.map((c) => c.url)).toEqual([WEB_B]);
  });

  test('abonnements expirés supprimés (410, DeviceNotRegistered) ; erreur passagère conservée', async () => {
    await saveSubscription(db, { kind: 'web', endpoint: WEB_A, keys: browserKeys() });
    await saveSubscription(db, { kind: 'web', endpoint: WEB_B, keys: browserKeys() });
    await saveSubscription(db, { kind: 'expo', endpoint: EXPO });
    await publish('Live', { liveStatus: 'live', startsAt: new Date() });
    const { fetchFn } = pushServices({ [WEB_A]: 410, [WEB_B]: 503 }, [EXPO]);
    expect(await notifyPending(db, { vapid, fetch: fetchFn })).toEqual({
      events: 1,
      sent: 0,
      removed: 2,
      failed: 1,
    });
    const left = await db.select({ endpoint: pushSubscription.endpoint }).from(pushSubscription);
    expect(left).toEqual([{ endpoint: WEB_B }]);
  });

  test('sans clés VAPID : abonnements web ignorés, Expo servi', async () => {
    await saveSubscription(db, { kind: 'web', endpoint: WEB_A, keys: browserKeys() });
    await saveSubscription(db, { kind: 'expo', endpoint: EXPO });
    await publish('Live', { liveStatus: 'live', startsAt: new Date() });
    const { calls, fetchFn } = pushServices();
    expect((await notifyPending(db, { vapid: null, fetch: fetchFn })).sent).toBe(1);
    expect(calls.map((c) => c.url)).toEqual(['https://exp.host/--/api/v2/push/send']);
  });
});

describe('messages et configuration', () => {
  test('titres par type', () => {
    const e = { itemId: 'x', title: 'Meeting', outlet: 'BFMTV' };
    expect(buildMessage({ ...e, kind: 'live' }).title).toBe('En direct : Meeting');
    expect(buildMessage({ ...e, kind: 'reminder' }).title).toBe('Dans 15 min : Meeting');
    expect(buildMessage({ ...e, kind: 'new_item' })).toMatchObject({
      title: 'Nouveau : Meeting',
      body: 'BFMTV',
      urgent: false,
    });
  });

  test('VAPID : absent, complet, ou incomplet (arrêt)', () => {
    expect(parseNotify({}).vapid).toBeNull();
    expect(parseNotify({ VAPID_PUBLIC_KEY: 'pub', VAPID_PRIVATE_KEY: 'priv' }).vapid?.subject).toBe(
      'mailto:lisnardplay@tmallet.fr',
    );
    expect(() => parseNotify({ VAPID_PUBLIC_KEY: 'pub' })).toThrow();
    expect(() =>
      parseNotify({ VAPID_PUBLIC_KEY: 'p', VAPID_PRIVATE_KEY: 'q', VAPID_SUBJECT: 'moi' }),
    ).toThrow();
  });
});
