import {
  DAY_PX,
  DOT_SIZE,
  layoutTimeline,
  MAX_STACK,
  OFFICIAL_SIZE,
  smallThumbnail,
  type TimelineIntervention,
} from '../timeline';

const days = [
  { day: '2026-09-30', members: 40000 },
  { day: '2026-10-01', members: 41000 },
  { day: '2026-10-02', members: 45000 },
];
const it = (id: string, day: string, official = true): TimelineIntervention => ({
  id,
  day,
  title: id,
  outlet: 'David Lisnard',
  thumbnailUrl: official ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null,
  official,
  live: false,
});

test('échelle fixe : 10 px par jour, ou toute la largeur disponible', () => {
  expect(layoutTimeline(days, [], 0)?.width).toBe(2 * DAY_PX + 32);
  expect(layoutTimeline(days, [], 800)?.width).toBe(800);
  expect(layoutTimeline([], [], 800)).toBeNull();
});

test('repères : posés sur la courbe, empilés sans se recouvrir le même jour', () => {
  const layout = layoutTimeline(
    days,
    [it('a', '2026-10-01'), it('b', '2026-10-01'), it('c', '2026-10-02', false)],
    0,
  );
  const [a, b, c] = layout?.markers ?? [];
  expect(a?.x).toBe(b?.x);
  // b au-dessus de a, sans chevauchement.
  expect((a?.y ?? 0) - (b?.y ?? 0)).toBeGreaterThanOrEqual(OFFICIAL_SIZE);
  expect(c?.size).toBe(DOT_SIZE);
  expect(a?.members).toBe(41000);
  expect(a?.type === 'item' && a.item.id).toBe('a');
  // Rien n'est coupé en haut : la marge couvre la plus haute pile.
  expect(Math.min(...(layout?.markers ?? []).map((m) => m.y - m.size / 2))).toBeGreaterThanOrEqual(
    0,
  );
});

test('intervention un jour absent de l’historique : rattachée au jour connu précédent', () => {
  const layout = layoutTimeline(days, [it('x', '2026-10-05'), it('y', '2026-09-01')], 0);
  expect(layout?.markers.map((m) => m.key)).toEqual(['x']);
});

test('journée chargée : vidéos officielles d’abord, le reste dans « +N », rien de perdu', () => {
  const items = [
    ...Array.from({ length: 6 }, (_, i) => it(`gn${i}`, '2026-10-02', false)),
    it('yt1', '2026-10-02'),
    it('yt2', '2026-10-02'),
  ];
  const markers = layoutTimeline(days, items, 0)?.markers ?? [];
  expect(markers).toHaveLength(MAX_STACK);
  const shown = markers.flatMap((m) => (m.type === 'item' ? [m.item.id] : []));
  expect(shown).toContain('yt1');
  expect(shown).toContain('yt2');
  const more = markers.find((m) => m.type === 'more');
  expect(more?.type === 'more' && more.items.length + shown.length).toBe(items.length);
});

test('total inchangé : échelle valide, sans valeur NaN', () => {
  const flat = [
    { day: '2026-10-01', members: 20000 },
    { day: '2026-10-02', members: 20000 },
  ];
  const layout = layoutTimeline(flat, [it('a', '2026-10-01')], 0);
  expect(layout?.line).not.toContain('NaN');
  expect(layout?.markers[0]?.y).not.toBeNaN();
});

test('petite variation : graduations exactes, toutes différentes', () => {
  const close = [
    { day: '2026-10-01', members: 59520 },
    { day: '2026-10-02', members: 59610 },
  ];
  const labels = layoutTimeline(close, [], 0)?.ticks.map((t) => t.label) ?? [];
  expect(new Set(labels).size).toBe(labels.length);
  expect(labels.some((l) => l.includes('k'))).toBe(false);
});

test('miniature petite taille pour les ronds', () => {
  expect(smallThumbnail('https://i.ytimg.com/vi/abc/hqdefault.jpg')).toBe(
    'https://i.ytimg.com/vi/abc/default.jpg',
  );
  expect(smallThumbnail('https://exemple.fr/image.jpg')).toBe('https://exemple.fr/image.jpg');
});
