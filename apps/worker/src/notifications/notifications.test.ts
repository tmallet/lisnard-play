import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import { createECDH, randomBytes } from 'node:crypto';

import type { Db } from '@lisnard/db/client';
import { item, notificationSent, pushSubscription } from '@lisnard/db/schema';
import { saveSubscription } from '@lisnard/db/subscriptions';
import { createTestDb } from '@lisnard/db/testing';
import type { NotificationEvent } from '@lisnard/db/write';
import { setMedia, upsertItem, upsertSources } from '@lisnard/db/write';
import { eq, sql } from 'drizzle-orm';
import webpush from 'web-push';

import { parseNotify } from '../config';
import { buildMessage, formatDuration, readableTitle, summaryLead } from './message';
import { notifyPending, sendTestNotification } from './task';

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
      deferred: 0,
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
      {
        to: EXPO,
        title: '🔴 David Lisnard est en direct',
        // Source de test non officielle : le média suit le titre.
        body: 'Meeting · David Lisnard',
        data: { url: `/interventions/${id}` },
      },
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
    const interview = await publish('Interview');
    // Vidéo sans résumé : notifiée après dix minutes d'attente.
    await db
      .update(item)
      .set({ firstSeenAt: sql`now() - interval '11 minutes'` })
      .where(eq(item.id, interview));
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
      deferred: 0,
      sent: 0,
      removed: 2,
      failed: 1,
    });
    const left = await db.select({ endpoint: pushSubscription.endpoint }).from(pushSubscription);
    expect(left).toEqual([{ endpoint: WEB_B }]);
  });

  test('sans clés VAPID : événement mis en attente pour les abonnés web, puis envoyé', async () => {
    await saveSubscription(db, { kind: 'web', endpoint: WEB_A, keys: browserKeys() });
    await publish('Live', { liveStatus: 'live', startsAt: new Date() });
    const { calls, fetchFn } = pushServices();
    expect(await notifyPending(db, { vapid: null, fetch: fetchFn })).toMatchObject({
      events: 0,
      deferred: 1,
    });
    expect(calls).toEqual([]);
    // Clés ajoutées : l'événement, resté dans la fenêtre, part au tour suivant.
    expect(await notifyPending(db, { vapid, fetch: fetchFn })).toMatchObject({
      events: 1,
      sent: 1,
    });
  });

  test('sans clés VAPID et sans abonné web : Expo servi', async () => {
    await saveSubscription(db, { kind: 'expo', endpoint: EXPO });
    await publish('Live', { liveStatus: 'live', startsAt: new Date() });
    const { calls, fetchFn } = pushServices();
    expect((await notifyPending(db, { vapid: null, fetch: fetchFn })).sent).toBe(1);
    expect(calls.map((c) => c.url)).toEqual(['https://exp.host/--/api/v2/push/send']);
  });
});

test('notification de test : envoyée à tous, sans rien journaliser', async () => {
  await saveSubscription(db, {
    kind: 'web',
    endpoint: WEB_A,
    keys: browserKeys(),
    preferences: { live: false, reminder: false, newItem: false },
  });
  const { calls, fetchFn } = pushServices();
  expect(await sendTestNotification(db, { vapid, fetch: fetchFn })).toEqual({
    sent: 1,
    removed: 0,
    failed: 0,
  });
  expect(calls.map((c) => c.url)).toEqual([WEB_A]);
  expect(await db.select().from(notificationSent)).toEqual([]);
});

describe('messages et configuration', () => {
  const event = (over: Partial<NotificationEvent> = {}): NotificationEvent => ({
    itemId: 'x',
    kind: 'new_item',
    title: 'Meeting',
    outlet: 'David Lisnard',
    official: true,
    sourceKind: 'youtube',
    interventionKind: 'stream',
    startsAt: null,
    durationS: null,
    thumbnailUrl: null,
    summaryText: null,
    ...over,
  });

  test('titres : court, emoji par type, « dans » pour la presse', () => {
    expect(buildMessage(event({ kind: 'live' })).title).toBe('🔴 David Lisnard est en direct');
    expect(buildMessage(event({ kind: 'reminder' })).title).toBe(
      '⏰ Dans 15 min : David Lisnard en direct',
    );
    expect(buildMessage(event()).title).toBe('🎥 Nouvelle vidéo de David Lisnard');
    expect(
      buildMessage(event({ official: false, outlet: 'BFMTV', interventionKind: 'tv' })).title,
    ).toBe('📰 David Lisnard sur BFMTV');
    expect(
      buildMessage(
        event({
          official: false,
          outlet: 'Le Figaro',
          interventionKind: 'presse',
          sourceKind: 'rss',
        }),
      ).title,
    ).toBe('📰 David Lisnard dans Le Figaro');
  });

  test('texte : titre lisible, durée, première phrase du résumé ; image en grand format', () => {
    const message = buildMessage(
      event({
        title: 'GARAGES À VÉLO OBLIGATOIRES',
        durationS: 125,
        summaryText: 'Il dénonce une norme absurde. Il propose de la supprimer.',
        thumbnailUrl: 'https://i.ytimg.com/vi/abc/hqdefault.jpg',
      }),
    );
    expect(message.body).toBe('Garages à vélo obligatoires · 2 min\nIl dénonce une norme absurde.');
    expect(message.image).toBe('https://i.ytimg.com/vi/abc/hq720.jpg');
  });

  test('rappel : média et heure de Paris ; direct : marque « EN DIRECT » retirée du titre', () => {
    const reminder = buildMessage(
      event({
        kind: 'reminder',
        official: false,
        outlet: 'BFMTV',
        title: 'Face à Face',
        startsAt: new Date('2026-10-13T06:30:00Z'),
      }),
    );
    expect(reminder.body).toBe('Face à Face · BFMTV · à 8 h 30');
    expect(
      buildMessage(
        event({ kind: 'live', title: '🔴 EN DIRECT I Meeting de David Lisnard en Alsace' }),
      ).body,
    ).toBe('Meeting de David Lisnard en Alsace');
  });

  test('titres en capitales réécrits, sigles conservés ; casse mixte inchangée', () => {
    expect(readableTitle('LE RN ET LFI FACE À BFMTV')).toBe('Le RN et LFI face à BFMTV');
    expect(readableTitle('Garages à vélo : « On marche sur la tête »')).toBe(
      'Garages à vélo : « On marche sur la tête »',
    );
    expect(readableTitle('IA')).toBe('IA');
  });

  test('durée et première phrase', () => {
    expect(formatDuration(45)).toBe('45 s');
    expect(formatDuration(3900)).toBe('1 h 05');
    expect(summaryLead('A'.repeat(200))).toHaveLength(140);
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
