import {
  membersFigure,
  outletChips,
  periodLabel,
  recapImagePath,
  recapPath,
  recapShareText,
  recapSummary,
} from '../recap';

test('libellés de période', () => {
  expect(periodLabel('day', '2026-10-13', '2026-10-13')).toBe('mardi 13 octobre');
  expect(periodLabel('week', '2026-10-12', '2026-10-18')).toBe('du 12 au 18 octobre');
  expect(periodLabel('week', '2026-09-28', '2026-10-04')).toBe('du 28 septembre au 4 octobre');
  expect(periodLabel('day', '2026-06-01', '2026-06-01')).toBe('lundi 1er juin');
  expect(periodLabel('week', '2026-05-25', '2026-06-01')).toBe('du 25 mai au 1er juin');
  expect(periodLabel('week', '2026-06-01', '2026-06-07')).toBe('du 1er au 7 juin');
});

test('message X et résumé, avec ou sans adhésions', () => {
  expect(recapShareText('day', '2026-10-13', '2026-10-13', 18, 1955)).toBe(
    'Mardi 13 octobre : 18 interventions, +1 955 adhérents.',
  );
  expect(recapShareText('week', '2026-10-12', '2026-10-18', 48, 16636)).toBe(
    'Semaine du 12 au 18 octobre : 48 interventions, +16 636 adhérents.',
  );
  expect(recapSummary(1, null)).toBe('1 intervention');
});

test('adresses et médias regroupés', () => {
  expect(recapPath('day', '2026-10-13')).toBe('/campagne?jour=2026-10-13');
  expect(recapImagePath('week', '2026-10-12')).toBe('/campagne/recap/semaine/2026-10-12.png');
  const outlets = [
    { name: 'BFMTV', official: false, count: 10 },
    { name: 'David Lisnard', official: true, count: 4 },
    { name: 'Capital', official: false, count: 1 },
  ];
  expect(outletChips(outlets)).toEqual(['BFMTV ×10', 'Sa chaîne ×4', 'Capital']);
  expect(outletChips(outlets, 1)).toEqual(['BFMTV ×10', '+2']);
});

test('adhésions : hausse et total, ou total seul en début d’historique', () => {
  expect(membersFigure({ total: 55943, delta: 1955 })).toEqual({
    value: '+1 955',
    caption: 'adhérents · 55 943 au total',
  });
  expect(membersFigure({ total: 20000, delta: null })).toEqual({
    value: '20 000',
    caption: 'adhérents au total',
  });
});
