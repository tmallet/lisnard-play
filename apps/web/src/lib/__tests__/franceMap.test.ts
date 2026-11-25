import { FRANCE_MAP, markerRadius, projectPlace } from '../franceMap';

test('métropole : Brest à l’ouest de Strasbourg, Lille au nord de Marseille', () => {
  const brest = projectPlace(48.39, -4.49);
  const strasbourg = projectPlace(48.58, 7.76);
  const lille = projectPlace(50.63, 3.06);
  const marseille = projectPlace(43.3, 5.37);
  expect(brest && strasbourg && brest.x < strasbourg.x).toBe(true);
  expect(lille && marseille && lille.y < marseille.y).toBe(true);
  for (const p of [brest, strasbourg, lille, marseille]) {
    expect(p?.x).toBeGreaterThanOrEqual(0);
    expect(p?.x).toBeLessThanOrEqual(FRANCE_MAP.width);
  }
});

test('outre-mer dans son encart ; étranger hors carte', () => {
  const reunion = projectPlace(-20.91, 55.44);
  expect(reunion?.y).toBeGreaterThan(520);
  expect(projectPlace(50.85, 4.35 + 20)).toBeNull();
});

test('rayon : croissant, de 5 à 14 px', () => {
  expect(markerRadius(1, 1)).toBe(14);
  expect(markerRadius(1, 4)).toBeLessThan(markerRadius(4, 4));
  expect(markerRadius(0, 4)).toBe(5);
});
