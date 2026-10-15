/**
 * Fabrique le fond de carte de France de la vue « Déplacements » (spec
 * intervention-places, ADR 0027) : contours des régions projetés en chemins SVG,
 * simplifiés, outre-mer en encarts. Rien n'est projeté à l'exécution.
 *
 * Source : france-geojson (Grégoire David), tracés IGN Admin Express, Licence Ouverte.
 *   https://github.com/gregoiredavid/france-geojson (regions-version-simplifiee.geojson,
 *   regions-avec-outre-mer.geojson)
 *
 * Usage : bun scripts/build-france-map.ts <regions-version-simplifiee.geojson> <regions-avec-outre-mer.geojson>
 * Sortie : apps/app/assets/france-map.json
 */
import { resolve } from 'node:path';

type Ring = [number, number][];
type Geometry =
  | { type: 'Polygon'; coordinates: Ring[] }
  | { type: 'MultiPolygon'; coordinates: Ring[][] };
interface Feature {
  properties: { code: string; nom: string };
  geometry: Geometry;
}

const [metroPath, overseasPath] = Bun.argv.slice(2);
if (!metroPath || !overseasPath)
  throw new Error('Usage : build-france-map.ts <métropole> <outre-mer>');
const metro = ((await Bun.file(metroPath).json()) as { features: Feature[] }).features;
const all = ((await Bun.file(overseasPath).json()) as { features: Feature[] }).features;

const WIDTH = 600;
const METRO_HEIGHT = 520;
const INSET = { y: 535, w: 112, h: 60, gap: 10 };
/** Tolérance de simplification, en pixels. */
const TOLERANCE = 0.6;

const polygons = (g: Geometry): Ring[][] =>
  g.type === 'Polygon' ? [g.coordinates] : g.coordinates;

function bbox(features: Feature[]) {
  let [minLon, minLat, maxLon, maxLat] = [180, 90, -180, -90];
  for (const f of features)
    for (const poly of polygons(f.geometry))
      for (const [lon, lat] of poly[0] ?? []) {
        minLon = Math.min(minLon, lon);
        maxLon = Math.max(maxLon, lon);
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
      }
  return [minLon, minLat, maxLon, maxLat] as [number, number, number, number];
}

/** Projection équirectangulaire corrigée de la latitude moyenne, cadrée dans un rectangle. */
function fit(box: [number, number, number, number], frame: [number, number, number, number]) {
  const [minLon, minLat, maxLon, maxLat] = box;
  const cos = Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180);
  const [fx, fy, fw, fh] = frame;
  const k = Math.min(fw / ((maxLon - minLon) * cos), fh / (maxLat - minLat));
  const ox = fx + (fw - (maxLon - minLon) * cos * k) / 2;
  const oy = fy + (fh - (maxLat - minLat) * k) / 2;
  return { minLon, maxLat, cos, k, ox, oy, bbox: box };
}

type Transform = ReturnType<typeof fit>;
const project = (t: Transform, [lon, lat]: [number, number]): [number, number] => [
  t.ox + (lon - t.minLon) * t.cos * t.k,
  t.oy + (t.maxLat - lat) * t.k,
];

/** Douglas-Peucker. */
function simplify(points: [number, number][], tolerance: number): [number, number][] {
  if (points.length < 3) return points;
  const [a, b] = [points[0] as [number, number], points[points.length - 1] as [number, number]];
  let max = 0;
  let index = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const [x, y] = points[i] as [number, number];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const d =
      dx === 0 && dy === 0
        ? Math.hypot(x - a[0], y - a[1])
        : Math.abs(dy * x - dx * y + b[0] * a[1] - b[1] * a[0]) / Math.hypot(dx, dy);
    if (d > max) [max, index] = [d, i];
  }
  if (max <= tolerance) return [a, b];
  return [
    ...simplify(points.slice(0, index + 1), tolerance).slice(0, -1),
    ...simplify(points.slice(index), tolerance),
  ];
}

function path(t: Transform, g: Geometry): string {
  const parts: string[] = [];
  for (const poly of polygons(g))
    for (const ring of poly) {
      const pts = simplify(
        ring.map((p) => project(t, p)),
        TOLERANCE,
      );
      if (pts.length < 3) continue;
      parts.push(`M${pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L')}Z`);
    }
  return parts.join('');
}

const metroT = fit(bbox(metro), [0, 0, WIDTH, METRO_HEIGHT]);
const OVERSEAS = ['01', '02', '03', '04', '06'];
const areas = [{ name: 'Métropole', ...metroT }];
const regions = metro.map((f) => ({
  code: f.properties.code,
  name: f.properties.nom,
  d: path(metroT, f.geometry),
}));
for (const [i, code] of OVERSEAS.entries()) {
  const f = all.find((x) => x.properties.code === code);
  if (!f) throw new Error(`région d'outre-mer absente : ${code}`);
  const frame: [number, number, number, number] = [
    i * (INSET.w + INSET.gap),
    INSET.y,
    INSET.w,
    INSET.h,
  ];
  const t = fit(bbox([f]), frame);
  areas.push({ name: f.properties.nom, ...t });
  regions.push({ code, name: f.properties.nom, d: path(t, f.geometry) });
}

const out = {
  source: 'IGN Admin Express via france-geojson (Grégoire David), Licence Ouverte 2.0',
  width: WIDTH,
  height: INSET.y + INSET.h,
  areas: areas.map(({ name, minLon, maxLat, cos, k, ox, oy, bbox: b }) => ({
    name,
    minLon,
    maxLat,
    cos: Number(cos.toFixed(6)),
    k: Number(k.toFixed(4)),
    ox: Number(ox.toFixed(2)),
    oy: Number(oy.toFixed(2)),
    bbox: b,
  })),
  regions,
};
const target = resolve(import.meta.dir, '../apps/app/assets/france-map.json');
await Bun.write(target, `${JSON.stringify(out)}\n`);
console.log(
  `${target} : ${(JSON.stringify(out).length / 1024).toFixed(1)} Ko, ${regions.length} régions`,
);
