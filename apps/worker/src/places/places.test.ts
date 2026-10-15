import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';

import type { Db } from '@lisnard/db/client';
import { item, summarySpend } from '@lisnard/db/schema';
import { createTestDb } from '@lisnard/db/testing';
import { setMedia, upsertItem, upsertSources } from '@lisnard/db/write';
import { eq, sql } from 'drizzle-orm';

import { SummaryServiceUnavailable } from '../summaries/openrouter';
import { geocodeCity, type Locator, type PlaceAnswer, parsePlaceAnswer } from './locate';
import { PLACE_PROMPT_VERSION } from './prompt';
import { locatePending } from './task';

/** Base adresse nationale simulée : Saint-Denis existe en Seine-Saint-Denis et à La Réunion. */
const ban = (async (input: string | URL | Request) => {
  const q = new URL(String(input)).searchParams.get('q');
  const feature = (name: string, context: string, lon: number, lat: number, score = 0.95) => ({
    geometry: { coordinates: [lon, lat] },
    properties: { name, city: name, context, score },
  });
  const features =
    q === 'Saint-Denis'
      ? [
          feature('Saint-Denis', '93, Seine-Saint-Denis, Île-de-France', 2.36, 48.94),
          feature('Saint-Denis', '974, La Réunion', 55.44, -20.91),
        ]
      : q === 'Saint-Raphaël'
        ? [feature('Saint-Raphaël', "83, Var, Provence-Alpes-Côte d'Azur", 6.77, 43.43)]
        : q === 'Introuvable'
          ? [feature('Ailleurs', '01, Ain', 5, 46, 0.2)]
          : [];
  return Response.json({ features });
}) as typeof fetch;

describe('réponse du modèle et géolocalisation', () => {
  test('« aucun lieu » quand le modèle ne situe rien, même s’il coche on_site', () => {
    expect(
      parsePlaceAnswer('{"on_site":true,"city":"","department":"","precision":"none"}'),
    ).toEqual({
      onSite: false,
      city: '',
      department: '',
      precision: 'none',
    });
    expect(() => parsePlaceAnswer('{"on_site":"oui"}')).toThrow();
  });

  test('homonymes départagés par le département ; score trop faible : introuvable', async () => {
    expect((await geocodeCity('Saint-Denis', 'La Réunion', ban))?.lat).toBe(-20.91);
    expect((await geocodeCity('Saint-Denis', 'Seine-Saint-Denis', ban))?.lat).toBe(48.94);
    expect(await geocodeCity('Introuvable', '', ban)).toBeNull();
  });
});

describe('tâche places', () => {
  let db: Db;
  let drop: () => Promise<void>;
  beforeAll(async () => {
    ({ db, drop } = await createTestDb());
    await upsertSources(db, [
      { id: 'yt:dl', kind: 'youtube', name: 'David Lisnard', active: true },
    ]);
  });
  afterAll(() => drop());
  beforeEach(async () => {
    await db.execute(sql`truncate ${item}, ${summarySpend} cascade`);
  });

  async function publish(title: string) {
    const { id } = await upsertItem(db, {
      sourceId: 'yt:dl',
      platformId: `yt:${title}`,
      url: `https://www.youtube.com/watch?v=${encodeURIComponent(title)}`,
      title,
      description: '',
      publishedAt: new Date(),
    });
    await db.update(item).set({ status: 'published' }).where(eq(item.id, id));
    await setMedia(db, id, { kind: 'embed', provider: 'youtube', embedUrl: 'https://x' });
    return id;
  }
  const answers: Record<string, PlaceAnswer> = {
    'Grand meeting à Saint-Raphaël': {
      onSite: true,
      city: 'Saint-Raphaël',
      department: 'Var',
      precision: 'city',
    },
    'Meeting en Alsace': {
      onSite: true,
      city: 'Saint-Denis',
      department: 'La Réunion',
      precision: 'region',
    },
    'Invité de BFMTV': { onSite: false, city: '', department: '', precision: 'none' },
  };
  const locator = (fail?: Error): Locator => ({
    model: 'test',
    ask: async ({ title }) => {
      if (fail) throw fail;
      return { answer: answers[title] as PlaceAnswer, model: 'test', cost: 0.001 };
    },
  });
  const placeOf = async (id: string) =>
    (await db.select({ place: item.place }).from(item).where(eq(item.id, id)))[0]?.place;

  test('déplacement situé, zone approximative, plateau sans lieu ; coût imputé au plafond', async () => {
    const meeting = await publish('Grand meeting à Saint-Raphaël');
    const region = await publish('Meeting en Alsace');
    const studio = await publish('Invité de BFMTV');
    const stats = await locatePending(db, locator(), { dailyBudget: 1, fetch: ban });
    expect(stats).toMatchObject({ located: 3, onSite: 2, failed: 0 });
    expect(await placeOf(meeting)).toMatchObject({
      city: 'Saint-Raphaël',
      approximate: false,
      promptVersion: PLACE_PROMPT_VERSION,
    });
    expect(await placeOf(region)).toMatchObject({ approximate: true, lat: -20.91 });
    expect(await placeOf(studio)).toMatchObject({ onSite: false, lat: null });
    const [spend] = await db.select().from(summarySpend);
    expect(spend?.cost).toBeCloseTo(0.003);
    // Rien à refaire ensuite.
    expect((await locatePending(db, locator(), { dailyBudget: 1, fetch: ban })).located).toBe(0);
  });

  test('plafond atteint ou service indisponible : rien n’est compté comme traité', async () => {
    const id = await publish('Grand meeting à Saint-Raphaël');
    expect((await locatePending(db, locator(), { dailyBudget: 0, fetch: ban })).budgetReached).toBe(
      true,
    );
    const down = await locatePending(db, locator(new SummaryServiceUnavailable('HTTP 402')), {
      dailyBudget: 1,
      fetch: ban,
    });
    expect(down.unavailable).toBe('HTTP 402');
    expect(await placeOf(id)).toBeNull();
  });
});
