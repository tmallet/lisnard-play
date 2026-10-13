import { describe, expect, test } from 'bun:test';

import type { ClassifierAnswers } from '@lisnard/db/schema';

import { evaluate, proposeThresholds, type ReferenceCase, themeScores } from './calibrate';

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
  test('évaluation : vrais/faux positifs et négatifs, AMF à écarter (ADR 0020)', () => {
    const ev = evaluate(cases, map, { intervient: 0.5, role: 0.6 });
    expect([ev.tp, ev.fp, ev.fn, ev.tn]).toEqual([2, 1, 0, 2]);
    expect(ev.precision).toBeCloseTo(2 / 3);
    expect(ev.recall).toBe(1);
    expect(ev.errors.map((e) => [e.platformId, e.kind])).toEqual([['c', 'faux positif']]);
  });

  test('proposition : précision maximale sous contrainte de rappel', () => {
    const best = proposeThresholds(cases, map, 0.5);
    expect(best?.precision).toBe(1);
    expect(best?.thresholds.intervient).toBeGreaterThan(0.6);
    expect(proposeThresholds(cases, map, 1)?.precision).toBeCloseTo(2 / 3);
  });

  test('chaîne officielle : intervention présumée, comme à la publication', () => {
    const official = { ...ref('o', true), official: true };
    const low = new Map([['o', answers(0.4, 'national', 0.9)]]);
    expect(evaluate([official], low, { intervient: 0.75, role: 0.6 }).tp).toBe(1);
    expect(evaluate([ref('o', true)], low, { intervient: 0.75, role: 0.6 }).fn).toBe(1);
  });

  test('thèmes : précision et rappel par thème sur les cas étiquetés', () => {
    const withThemes = (id: string, themes: ReferenceCase['expected']['themes']) => ({
      ...ref(id, true),
      expected: { intervient: true, role: 'national', kind: 'tv', themes },
    });
    const themed = [
      withThemes('t1', ['economie']),
      withThemes('t2', ['securite']),
      ref('t3', true),
    ];
    const probs = (themes: ClassifierAnswers['themes']) => ({
      ...answers(0.9, 'national', 0.9),
      themes,
    });
    const answersMap = new Map([
      ['t1', probs({ economie: 0.8, securite: 0.6 })],
      ['t2', probs({ securite: 0.3 })],
      ['t3', probs({ economie: 0.9 })], // non étiqueté : ignoré
    ]);
    const { cases: n, scores } = themeScores(themed, answersMap, 0.5);
    expect(n).toBe(2);
    const by = Object.fromEntries(scores.map((s) => [s.theme, s]));
    expect(by.economie).toMatchObject({ tp: 1, fp: 0, fn: 0 });
    expect(by.securite).toMatchObject({ tp: 0, fp: 1, fn: 1, precision: 0, recall: 0 });
  });
});
