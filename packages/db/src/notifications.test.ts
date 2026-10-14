import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import { eq, sql } from 'drizzle-orm';

import type { Db } from './client';
import { item, notificationSent, pushSubscription } from './schema';
import {
  countSubscriptions,
  DEFAULT_PREFERENCES,
  deleteSubscription,
  saveSubscription,
  updatePreferences,
} from './subscriptions';
import { createTestDb } from './testing';
import {
  claimNotification,
  listNotificationEvents,
  listSubscribers,
  purgeStaleSubscriptions,
  setMedia,
  upsertItem,
  upsertSources,
} from './write';

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

const WEB = 'https://fcm.googleapis.com/fcm/send/abc';
const keys = { p256dh: 'p', auth: 'a' };

describe('abonnements (écrits par l’API)', () => {
  test('création avec les préférences par défaut, puis confirmation sans les écraser', async () => {
    expect(await saveSubscription(db, { kind: 'web', endpoint: WEB, keys })).toEqual(
      DEFAULT_PREFERENCES,
    );
    await updatePreferences(db, WEB, { live: true, reminder: false, newItem: true });
    expect(await saveSubscription(db, { kind: 'web', endpoint: WEB, keys })).toEqual({
      live: true,
      reminder: false,
      newItem: true,
    });
    expect(await countSubscriptions(db)).toBe(1);
  });

  test('mise à jour et suppression d’un abonnement inconnu : sans effet', async () => {
    expect(await updatePreferences(db, 'https://fcm.googleapis.com/x', DEFAULT_PREFERENCES)).toBe(
      null,
    );
    expect(await deleteSubscription(db, 'https://fcm.googleapis.com/x')).toBe(false);
    await saveSubscription(db, { kind: 'web', endpoint: WEB, keys });
    expect(await deleteSubscription(db, WEB)).toBe(true);
    expect(await countSubscriptions(db)).toBe(0);
  });

  test('abonnés par type et purge à 13 mois', async () => {
    await saveSubscription(db, { kind: 'web', endpoint: WEB, keys });
    await saveSubscription(db, {
      kind: 'expo',
      endpoint: 'ExponentPushToken[abcdefghijkl]',
      preferences: { live: false, reminder: false, newItem: true },
    });
    expect((await listSubscribers(db, 'live')).map((s) => s.kind)).toEqual(['web']);
    expect((await listSubscribers(db, 'new_item')).map((s) => s.kind)).toEqual(['expo']);
    await db
      .update(pushSubscription)
      .set({ confirmedAt: sql`now() - interval '14 months'` })
      .where(eq(pushSubscription.endpoint, WEB));
    expect(await purgeStaleSubscriptions(db)).toBe(1);
    expect(await countSubscriptions(db)).toBe(1);
  });
});

describe('événements à notifier', () => {
  async function add(
    id: string,
    over: Partial<Parameters<typeof upsertItem>[1]> = {},
    opts: { published?: boolean; media?: boolean } = {},
  ) {
    const { id: itemId } = await upsertItem(db, {
      sourceId: 'yt:dl',
      platformId: `yt:${id}`,
      url: `https://www.youtube.com/watch?v=${id}`,
      title: id,
      description: '',
      publishedAt: new Date(),
      ...over,
    });
    if (opts.published !== false)
      await db.update(item).set({ status: 'published' }).where(eq(item.id, itemId));
    if (opts.media !== false)
      await setMedia(db, itemId, { kind: 'embed', provider: 'youtube', embedUrl: 'https://x' });
    return itemId;
  }
  const kinds = async () =>
    (await listNotificationEvents(db)).map((e) => `${e.title}:${e.kind}`).sort();

  test('direct, rappel et nouvelle intervention ; rien pour le non publié ou sans rendu', async () => {
    await add('Live', { liveStatus: 'live', startsAt: new Date() });
    await add('Soon', { liveStatus: 'upcoming', startsAt: new Date(Date.now() + 10 * 60_000) });
    await add('Later', { liveStatus: 'upcoming', startsAt: new Date(Date.now() + 3_600_000) });
    await add('Video');
    await add('Pending', {}, { published: false });
    await add('NoMedia', {}, { media: false });
    expect(await kinds()).toEqual(['Live:live', 'Soon:reminder', 'Video:new_item']);
  });

  test('un seul envoi par événement ; la rediffusion d’un direct annoncé n’est pas « nouvelle »', async () => {
    const live = await add('Live', { liveStatus: 'live', startsAt: new Date() });
    expect(await claimNotification(db, live, 'live')).toBe(true);
    expect(await claimNotification(db, live, 'live')).toBe(false);
    await db.update(item).set({ liveStatus: 'ended' }).where(eq(item.id, live));
    expect(await kinds()).toEqual([]);
  });

  test('rattrapage : un contenu vu il y a plus de 2 heures n’est pas notifié', async () => {
    const old = await add('Old');
    await db
      .update(item)
      .set({ firstSeenAt: sql`now() - interval '3 hours'` })
      .where(eq(item.id, old));
    await add('OldLive', { liveStatus: 'live', startsAt: new Date(Date.now() - 3 * 3_600_000) });
    expect(await kinds()).toEqual([]);
    expect(await db.select().from(notificationSent)).toEqual([]);
  });
});
