import { afterAll, beforeAll, expect, test } from 'bun:test';
import { createHmac } from 'node:crypto';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { Db } from '@lisnard/db/client';
import { item } from '@lisnard/db/schema';
import { createTestDb } from '@lisnard/db/testing';
import { setMedia, upsertItem, upsertSources } from '@lisnard/db/write';
import { eq } from 'drizzle-orm';

import { createAccount } from './account';
import { type Auth, createAuth } from './auth';
import { createAdminHandler } from './handler';

const ORIGIN = 'http://localhost:3001';
const EMAIL = 'admin@example.test';
const PASSWORD = 'mot-de-passe-solide';

let db: Db;
let drop: () => Promise<void>;
let auth: Auth;
let handle: (req: Request) => Promise<Response>;
let videoId: string;

/** Code TOTP (RFC 6238, SHA-1, 6 chiffres, 30 s) à partir du secret en base 32. */
function totp(secret: string, at = Date.now()): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const c of secret.replace(/=+$/, '').toUpperCase())
    bits += alphabet.indexOf(c).toString(2).padStart(5, '0');
  const key = Buffer.from(bits.match(/.{8}/g)?.map((b) => Number.parseInt(b, 2)) ?? []);
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(at / 30_000)));
  const h = createHmac('sha1', key).update(counter).digest();
  const offset = (h[h.length - 1] ?? 0) & 0xf;
  const code = (h.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return String(code).padStart(6, '0');
}

/** Navigateur minimal : garde les cookies reçus et les renvoie. */
function browser() {
  const jar = new Map<string, string>();
  const cookies: string[] = [];
  return {
    cookies,
    async call(path: string, init: { method?: string; body?: unknown } = {}) {
      const res = await handle(
        new Request(`${ORIGIN}${path}`, {
          method: init.method ?? (init.body === undefined ? 'GET' : 'POST'),
          headers: {
            Origin: ORIGIN,
            'Content-Type': 'application/json',
            Cookie: [...jar].map(([k, v]) => `${k}=${v}`).join('; '),
          },
          body: init.body === undefined ? undefined : JSON.stringify(init.body),
        }),
      );
      for (const c of res.headers.getSetCookie()) {
        cookies.push(c);
        const [pair] = c.split(';');
        const [name, ...value] = (pair ?? '').split('=');
        if (name) jar.set(name, value.join('='));
      }
      return res;
    },
    trpc(path: string, input?: unknown) {
      const query =
        input === undefined ? '' : `?input=${encodeURIComponent(JSON.stringify(input))}`;
      return this.call(`/admin/api/trpc/${path}${query}`);
    },
  };
}

beforeAll(async () => {
  ({ db, drop } = await createTestDb());
  auth = createAuth({
    db,
    secret: 'secret-de-test-assez-long-pour-better-auth',
    baseURL: ORIGIN,
    secure: false,
  });
  const clientDir = mkdtempSync(join(tmpdir(), 'admin-ui-'));
  writeFileSync(join(clientDir, 'index.html'), '<!doctype html><title>Admin</title>');
  handle = createAdminHandler({ db, auth, clientDir });
  await upsertSources(db, [{ id: 'yt:bfm', kind: 'youtube', name: 'BFMTV', active: true }]);
  ({ id: videoId } = await upsertItem(db, {
    sourceId: 'yt:bfm',
    platformId: 'yt:a',
    url: 'https://www.youtube.com/watch?v=a',
    title: 'Face à Face',
    description: '',
    publishedAt: new Date('2026-10-13T06:30:00Z'),
  }));
  await db.update(item).set({ status: 'published' }).where(eq(item.id, videoId));
  await setMedia(db, videoId, { kind: 'embed', provider: 'youtube', embedUrl: 'https://x' });
});
afterAll(() => drop());

test('inscription impossible ; un seul compte créé par la commande', async () => {
  const signUp = await browser().call('/admin/api/auth/sign-up/email', {
    body: { email: 'intrus@example.test', password: 'mot-de-passe-solide', name: 'Intrus' },
  });
  // Refus réel de l'inscription (et non une route introuvable).
  expect(signUp.status).toBeGreaterThanOrEqual(400);
  expect(signUp.status).not.toBe(404);
  await createAccount(auth, db, EMAIL, PASSWORD);
  expect(createAccount(auth, db, 'autre@example.test', PASSWORD)).rejects.toThrow(
    'un compte existe déjà',
  );
});

test('mot de passe seul : aucune donnée ; association du TOTP, puis accès', async () => {
  const b = browser();
  expect((await b.trpc('items.list', {})).status).toBe(401);
  const signIn = await b.call('/admin/api/auth/sign-in/email', {
    body: { email: EMAIL, password: PASSWORD },
  });
  expect(signIn.status).toBe(200);
  const session = b.cookies.find((c) => c.includes('session_token'));
  expect(session).toMatch(/Path=\/admin/);
  expect(session).toMatch(/HttpOnly/i);
  expect(session).toMatch(/SameSite=Strict/i);
  // Connecté sans TOTP : seule l'association est possible.
  expect((await b.trpc('items.list', {})).status).toBe(403);
  expect(await (await b.trpc('me')).json()).toMatchObject({
    result: { data: { twoFactorEnabled: false } },
  });

  const enable = await b.call('/admin/api/auth/two-factor/enable', {
    body: { password: PASSWORD },
  });
  const { totpURI, backupCodes } = (await enable.json()) as {
    totpURI: string;
    backupCodes: string[];
  };
  expect(backupCodes.length).toBeGreaterThan(5);
  const secret = new URL(totpURI).searchParams.get('secret') ?? '';
  const verify = await b.call('/admin/api/auth/two-factor/verify-totp', {
    body: { code: totp(secret) },
  });
  expect(verify.status).toBe(200);
  const list = await b.trpc('items.list', {});
  expect(list.status).toBe(200);
  expect(await list.json()).toMatchObject({ result: { data: { total: 1 } } });

  // Nouvelle connexion : mot de passe, puis code obligatoire avant toute donnée.
  const c = browser();
  const again = await c.call('/admin/api/auth/sign-in/email', {
    body: { email: EMAIL, password: PASSWORD },
  });
  expect(await again.json()).toMatchObject({ twoFactorRedirect: true });
  expect((await c.trpc('items.list', {})).status).toBe(401);
  expect(
    (await c.call('/admin/api/auth/two-factor/verify-totp', { body: { code: '000000' } })).ok,
  ).toBe(false);
  expect(
    (await c.call('/admin/api/auth/two-factor/verify-totp', { body: { code: totp(secret) } }))
      .status,
  ).toBe(200);

  // Action : masquer la vidéo, inscrite au journal.
  const hide = await c.call('/admin/api/trpc/items.hide', {
    body: { id: videoId, reason: 'Test' },
  });
  expect(hide.status).toBe(200);
  const [row] = await db.select().from(item).where(eq(item.id, videoId));
  expect(row?.hiddenAt).not.toBeNull();
  const actions = await (await c.trpc('actions.list', {})).json();
  expect(actions).toMatchObject({ result: { data: { total: 1 } } });
});

test('interface et en-têtes : noindex partout, application servie à toute adresse /admin', async () => {
  const page = await browser().call('/admin/videos/123');
  expect(page.status).toBe(200);
  expect(await page.text()).toContain('<title>Admin</title>');
  expect(page.headers.get('x-robots-tag')).toBe('noindex, nofollow');
  expect((await browser().call('/ailleurs')).status).toBe(404);
});
