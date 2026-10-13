import { describe, expect, test } from 'bun:test';

import type { ClassifierAnswers } from '@lisnard/db/schema';

import { evaluate, proposeThresholds, type ReferenceCase } from './calibrate';

const answers = (intervient: number, role: string, confidence: number): ClassifierAnswers => ({
  intervient,
  role: { choice: role, confidence, probabilities: {} },
  kind: { choice: 'tv', confidence: 1, probabilities: {} },
});

const ref = (platformId: string, intervient: boolean, role = 'national'): ReferenceCase => ({
  platformId,
  outlet: 'x',
  title: platformId,
  expected: { intervient, role, kind: 'tv' },
  validated: true,
});

const cases = [
  ref('a', true),
  ref('b', true),
  ref('c', false),
  ref('d', true, 'mairie'),
  ref('e', true, 'amf'),
];
const map = new Map([
  ['a', answers(0.9, 'national', 0.9)],
  ['b', answers(0.55, 'national', 0.9)],
  ['c', answers(0.6, 'national', 0.9)],
  ['d', answers(0.9, 'mairie', 0.9)],
  ['e', answers(0.8, 'amf', 0.7)],
]);

describe('calibration', () => {
  test('évaluation : vrais/faux positifs et négatifs', () => {
    const ev = evaluate(cases, map, { intervient: 0.5, role: 0.6 });
    expect([ev.tp, ev.fp, ev.fn, ev.tn]).toEqual([3, 1, 0, 1]);
    expect(ev.precision).toBeCloseTo(0.75);
    expect(ev.recall).toBe(1);
    expect(ev.errors.map((e) => [e.platformId, e.kind])).toEqual([['c', 'faux positif']]);
  });

  test('proposition : précision maximale sous contrainte de rappel', () => {
    const best = proposeThresholds(cases, map, 0.6);
    expect(best?.precision).toBe(1);
    expect(best?.thresholds.intervient).toBeGreaterThan(0.6);
    expect(proposeThresholds(cases, map, 1)?.precision).toBeCloseTo(0.75);
  });
});
