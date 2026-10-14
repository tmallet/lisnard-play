import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

import type { Db } from '@lisnard/db/client';
import { pushSubscription } from '@lisnard/db/schema';
import { isPushServiceUrl } from '@lisnard/db/subscriptions';
import { createTestDb } from '@lisnard/db/testing';
import { TRPCError } from '@trpc/server';
import { sql } from 'drizzle-orm';

import { createContext } from './context';
import { createCaller } from './root';

let db: Db;
let drop: () => Promise<void>;
beforeAll(async () => {
  ({ db, drop } = await createTestDb());
});
afterAll(() => drop());
beforeEach(async () => {
  await db.execute(sql`truncate ${pushSubscription}`);
});

const caller = (vapidPublicKey: string | null = 'BPublicKey') =>
  createCaller(createContext({ version: 'test', isDev: true, db, vapidPublicKey }));

const WEB = {
  kind: 'web' as const,
  endpoint: 'https://fcm.googleapis.com/fcm/send/abcdef',
  keys: { p256dh: 'B'.repeat(87), auth: 'a'.repeat(22) },
};

async function codeOf(promise: Promise<unknown>) {
  try {
    await promise;
    return 'OK';
  } catch (error) {
    return error instanceof TRPCError ? error.code : String(error);
  }
}

describe('notifications', () => {
  test('config : clé publique, ou null quand le web n’est pas configuré', async () => {
    expect(await caller().notifications.config()).toEqual({ vapidPublicKey: 'BPublicKey' });
    expect(await caller(null).notifications.config()).toEqual({ vapidPublicKey: null });
  });

  test('abonnement, préférences, désabonnement', async () => {
    const api = caller().notifications;
    expect(await api.subscribe(WEB)).toEqual({ live: true, reminder: true, newItem: false });
    expect(
      await api.update({
        endpoint: WEB.endpoint,
        preferences: { live: true, reminder: false, newItem: true },
      }),
    ).toEqual({ live: true, reminder: false, newItem: true });
    expect(await api.unsubscribe({ endpoint: WEB.endpoint })).toEqual({ ok: true });
    expect(await codeOf(api.unsubscribe({ endpoint: WEB.endpoint }))).toBe('NOT_FOUND');
  });

  test('jeton Expo accepté ; adresse hors liste blanche ou jeton mal formé refusés', async () => {
    const api = caller().notifications;
    expect(
      await codeOf(api.subscribe({ kind: 'expo', endpoint: 'ExponentPushToken[abcdefghijklmn]' })),
    ).toBe('OK');
    expect(await codeOf(api.subscribe({ ...WEB, endpoint: 'https://exemple.com/push' }))).toBe(
      'BAD_REQUEST',
    );
    expect(await codeOf(api.subscribe({ kind: 'expo', endpoint: 'pas un jeton' }))).toBe(
      'BAD_REQUEST',
    );
  });

  test('liste blanche des services push', () => {
    for (const ok of [
      'https://fcm.googleapis.com/fcm/send/x',
      'https://updates.push.services.mozilla.com/wpush/v2/x',
      'https://web.push.apple.com/x',
      'https://wns2-par02p.notify.windows.com/w/?token=x',
    ])
      expect(isPushServiceUrl(ok)).toBe(true);
    for (const bad of [
      'http://fcm.googleapis.com/x',
      'https://fcm.googleapis.com:8443/x',
      'https://evil.com/fcm.googleapis.com',
      'https://fcm.googleapis.com.evil.com/x',
      'https://127.0.0.1/x',
    ])
      expect(isPushServiceUrl(bad)).toBe(false);
  });
});

test('frontière d’écriture (ADR 0017, 0024) : le code de l’API n’importe pas `write`', async () => {
  const dir = join(import.meta.dir);
  const files = (await readdir(dir, { recursive: true })).filter(
    (f) => f.endsWith('.ts') && !f.endsWith('.test.ts'),
  );
  for (const file of files) {
    const text = await Bun.file(join(dir, file)).text();
    expect({ file, importsWrite: text.includes('@lisnard/db/write') }).toEqual({
      file,
      importsWrite: false,
    });
  }
});
