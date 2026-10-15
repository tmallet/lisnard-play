import { expect, test } from 'bun:test';

import type { PlacedIntervention } from '@lisnard/db/read';

import { groupPlaces } from './routers/campaign';

const at = (id: string, lat: number, lon: number, approximate = false): PlacedIntervention => ({
  id,
  title: id,
  outlet: 'David Lisnard',
  day: '2026-10-01',
  thumbnailUrl: null,
  label: 'Lieu',
  city: 'Ville',
  lat,
  lon,
  approximate,
});

test('lieux : regroupés par coordonnées, les plus fréquentés d’abord', () => {
  const places = groupPlaces([
    at('a', 43.4427, 6.7685),
    at('b', 49.2782, -0.7023),
    at('c', 43.4427, 6.7685),
  ]);
  expect(places.map((p) => p.interventions.map((i) => i.id))).toEqual([['a', 'c'], ['b']]);
});

test('lieu approximatif seulement si toutes ses interventions le sont', () => {
  expect(groupPlaces([at('a', 48.58, 7.76, true), at('b', 48.58, 7.76)])[0]?.approximate).toBe(
    false,
  );
  expect(groupPlaces([at('a', 48.58, 7.76, true)])[0]?.approximate).toBe(true);
});
