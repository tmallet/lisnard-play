import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import type { Db } from '@lisnard/db/client';
import { item } from '@lisnard/db/schema';
import { createTestDb } from '@lisnard/db/testing';
import { setMedia, upsertItem, upsertSources } from '@lisnard/db/write';
import { eq } from 'drizzle-orm';

import { createContext } from './context';
import { CACHE_MS, createMembershipSource, RETRY_MS } from './membership/source';
import { createCaller } from './root';
import { cachedTimelineItems, parisDay, TIMELINE_ITEMS_MS } from './routers/membership';

const TOTAL = { adherents: 59523, mis_a_jour: '2026-10-15T08:05:23.281Z', source: 'NE' };
const HISTORY = {
  depuis: '2026-10-05',
  jours: [
    { jour: '2026-10-05', adherents: 47000 },
    { jour: '2026-10-06', adherents: 47100 },
    { jour: '2026-10-07', adherents: 49300 },
    { jour: '2026-10-14', adherents: 59049 },
  ],
};

/** Source factice : compte les appels, peut échouer ou renvoyer un format inattendu. */
function fakeSource(mode: { fail?: boolean; invalid?: boolean } = {}) {
  const calls: string[] = [];
  const fetchFn = (async (input: string | URL | Request) => {
    const url = String(input);
    calls.push(url);
    if (mode.fail) return new Response('boom', { status: 503 });
    if (mode.invalid) return Response.json({ adherents: 'beaucoup' });
    return Response.json(url.endsWith('/historique.json') ? HISTORY : TOTAL);
  }) as typeof fetch;
  return { calls, fetchFn };
}

describe('source des adhésions', () => {
  test('cache : une seule lecture pour des appels simultanés et pendant 90 s', async () => {
    let t = 0;
    const { calls, fetchFn } = fakeSource();
    const source = createMembershipSource({
      baseUrl: 'https://src.test',
      fetch: fetchFn,
      now: () => t,
    });
    await Promise.all(Array.from({ length: 100 }, () => source.get()));
    expect(calls).toHaveLength(2); // total + historique
    t = CACHE_MS - 1;
    await source.get();
    expect(calls).toHaveLength(2);
    t = CACHE_MS + 1;
    expect((await source.get()).data?.total.members).toBe(59523);
    expect(calls).toHaveLength(4);
  });

  test('panne ou format inattendu : dernière valeur valide, puis nouvel essai après 30 s', async () => {
    let t = 0;
    const mode: { fail?: boolean; invalid?: boolean } = {};
    const { calls, fetchFn } = fakeSource(mode);
    const source = createMembershipSource({
      baseUrl: 'https://src.test',
      fetch: fetchFn,
      now: () => t,
    });
    await source.get();
    mode.invalid = true;
    t = CACHE_MS + 1;
    expect(await source.get()).toMatchObject({ stale: true, data: { total: { members: 59523 } } });
    const after = calls.length;
    t += RETRY_MS - 1;
    await source.get();
    expect(calls).toHaveLength(after);
    mode.invalid = false;
    t += 2;
    expect((await source.get()).stale).toBe(false);
  });

  test('aucune valeur et source en panne : data null, sans exception', async () => {
    const { fetchFn } = fakeSource({ fail: true });
    const source = createMembershipSource({ baseUrl: 'https://src.test', fetch: fetchFn });
    expect(await source.get()).toEqual({ data: null, stale: false });
  });
});

describe('membership.timeline', () => {
  let db: Db;
  let drop: () => Promise<void>;
  beforeAll(async () => {
    ({ db, drop } = await createTestDb());
    await upsertSources(db, [
      { id: 'yt:dl', kind: 'youtube', name: 'David Lisnard', active: true, official: true },
    ]);
    const { id } = await upsertItem(db, {
      sourceId: 'yt:dl',
      platformId: 'yt:a',
      url: 'https://www.youtube.com/watch?v=a',
      title: 'Meeting',
      description: '',
      publishedAt: new Date('2026-10-06T10:00:00Z'),
      thumbnailUrl: 'https://i.ytimg.com/vi/a/hqdefault.jpg',
    });
    await db.update(item).set({ status: 'published' }).where(eq(item.id, id));
    await setMedia(db, id, { kind: 'embed', provider: 'youtube', embedUrl: 'https://x' });
  });
  afterAll(() => drop());

  test('historique coupé à la première intervention, jour en cours au total en direct', async () => {
    const { fetchFn } = fakeSource();
    const caller = createCaller(
      createContext({
        version: 'test',
        isDev: true,
        db,
        membership: createMembershipSource({ baseUrl: 'https://src.test', fetch: fetchFn }),
        now: () => new Date('2026-10-15T09:00:00Z'),
      }),
    );
    const r = await caller.membership.timeline();
    expect(r.days.map((d) => d.day)).toEqual([
      '2026-10-06',
      '2026-10-07',
      '2026-10-14',
      '2026-10-15',
    ]);
    expect(r.days.at(-1)?.members).toBe(59523);
    expect(r.interventions).toEqual([
      expect.objectContaining({ title: 'Meeting', day: '2026-10-06', official: true, live: false }),
    ]);
    expect(r).toMatchObject({
      stale: false,
      source: 'Nouvelle Énergie',
      total: { members: 59523 },
    });
  });

  test('interventions du graphique : une requête par minute au plus', async () => {
    // Après le cache rempli par le test précédent (horloge réelle).
    const t0 = Date.now() + 10 * TIMELINE_ITEMS_MS;
    const first = await cachedTimelineItems(db, t0);
    await upsertItem(db, {
      sourceId: 'yt:dl',
      platformId: 'yt:b',
      url: 'https://www.youtube.com/watch?v=b',
      title: 'Nouvelle',
      description: '',
      publishedAt: new Date('2026-10-07T10:00:00Z'),
    });
    expect(await cachedTimelineItems(db, t0 + TIMELINE_ITEMS_MS - 1)).toBe(first);
    expect(await cachedTimelineItems(db, t0 + TIMELINE_ITEMS_MS + 1)).not.toBe(first);
  });

  test('jour de Paris', () => {
    expect(parisDay(new Date('2026-10-14T22:30:00Z'))).toBe('2026-10-15');
  });
});
