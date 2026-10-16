import { INDEPENDENCE_NOTICE } from '../../config/app';
import type { CardNode } from '../quote-card';
import { placeNames, recapCard } from '../recap-card';
import { recapImageParams, recapPageMeta, recapPageParams } from '../recap-page';

const texts = (node: CardNode | string): string[] => {
  if (typeof node === 'string') return [node];
  const c = node.props.children;
  if (c === undefined) return [];
  return (Array.isArray(c) ? c : [c]).flatMap(texts);
};

const recap = {
  period: 'day' as const,
  from: '2026-10-13',
  to: '2026-10-13',
  interventions: Array.from({ length: 18 }, (_, i) => ({ id: String(i) })),
  outlets: [
    { name: 'BFMTV', official: false, count: 10 },
    { name: 'David Lisnard', official: true, count: 4 },
  ],
  places: [{ label: 'Nice', lat: 43.7, lon: 7.27 }],
  quote: { text: "L'État profond, c'est Bercy.", outlet: 'BFMTV', official: false },
  members: {
    total: 55943,
    delta: 1955,
    curve: [
      { day: '2026-10-12', members: 53988 },
      { day: '2026-10-13', members: 55943 },
    ],
  },
};

test('image : période, chiffres, médias, citation, lieux, site et mention', () => {
  const card = recapCard({ ...recap, count: 18, host: 'play.projetlisnard.fr' });
  expect(card.props.style).toMatchObject({ width: 1200, height: 630 });
  expect(texts(card)).toEqual(
    expect.arrayContaining([
      'MARDI 13 OCTOBRE 2026',
      'La journée de David Lisnard',
      '18',
      'BFMTV ×10',
      'Sa chaîne ×4',
      '+1 955',
      'adhérents · 55 943 au total',
      "« L'État profond, c'est Bercy. »",
      'Nice',
      'play.projetlisnard.fr',
      INDEPENDENCE_NOTICE,
    ]),
  );
});

test('image : sans adhésions, sans lieu, sans citation', () => {
  const card = recapCard({
    ...recap,
    count: 1,
    members: null,
    places: [],
    quote: null,
    host: 'h',
  });
  const all = texts(card).join(' ');
  expect(all).not.toMatch(/adhérents|«/);
  expect(JSON.stringify(card)).not.toContain('image/svg');
});

test('noms des lieux, au plus trois', () => {
  expect(placeNames([{ label: 'A' }, { label: 'B' }, { label: 'C' }, { label: 'D' }])).toBe(
    'A · B · C +1',
  );
  expect(placeNames([{ label: 'Nice' }, { label: '' }, { label: 'Cannes' }])).toBe('Nice · Cannes');
});

test('adresses : page Campagne avec jour ou semaine, image du récapitulatif', () => {
  const page = (u: string) => recapPageParams(new URL(u, 'https://play.test'));
  expect(page('/campagne?jour=2026-10-13')).toEqual({ period: 'day', start: '2026-10-13' });
  expect(page('/campagne?semaine=2026-10-12')).toEqual({ period: 'week', start: '2026-10-12' });
  expect(page('/campagne?jour=hier')).toBeNull();
  expect(page('/a-propos?jour=2026-10-13')).toBeNull();
  expect(recapImageParams('/campagne/recap/semaine/2026-10-12.png')).toEqual({
    period: 'week',
    start: '2026-10-12',
  });
  expect(recapImageParams('/campagne/recap/mois/2026-10.png')).toBeNull();
});

test('aperçu : titre, résumé, image versionnée, adresse de la page', () => {
  const meta = recapPageMeta(recap, 'https://play.test');
  expect(meta.title).toBe('La journée de David Lisnard, mardi 13 octobre · Lisnard Play');
  expect(meta.description).toBe(
    "18 interventions, +1 955 adhérents. « L'État profond, c'est Bercy. »",
  );
  expect(meta.tags).toContain(
    '<meta property="og:url" content="https://play.test/campagne?jour=2026-10-13"/>',
  );
  expect(meta.tags).toMatch(
    /og:image" content="https:\/\/play\.test\/campagne\/recap\/jour\/2026-10-13\.png\?v=[0-9a-f]+"/,
  );
  // Le jour évolue (nouvelle intervention) : l'adresse de l'image change.
  const later = recapPageMeta(
    { ...recap, interventions: [...recap.interventions, { id: 'x' }] },
    'https://play.test',
  );
  expect(later.tags).not.toBe(meta.tags);
});
