// Chemin relatif : l'alias @/assets n'est pas connu de Jest.
import map from '../../assets/france-map.json';

/**
 * Fond de carte de France (spec intervention-places, ADR 0027), précalculé par
 * scripts/build-france-map.ts : régions en chemins SVG, outre-mer en encarts.
 */
export const FRANCE_MAP = map;

interface Area {
  minLon: number;
  maxLat: number;
  cos: number;
  k: number;
  ox: number;
  oy: number;
  bbox: number[];
}

/** Marge autour d'une zone, en degrés : une commune côtière reste dans son encart. */
const MARGIN = 0.3;

/** Position d'un lieu sur la carte ; null s'il est hors de la métropole et des encarts. */
export function projectPlace(lat: number, lon: number): { x: number; y: number } | null {
  const area = (map.areas as Area[]).find(
    ({ bbox: [minLon = 0, minLat = 0, maxLon = 0, maxLat = 0] }) =>
      lon >= minLon - MARGIN &&
      lon <= maxLon + MARGIN &&
      lat >= minLat - MARGIN &&
      lat <= maxLat + MARGIN,
  );
  if (!area) return null;
  return {
    x: area.ox + (lon - area.minLon) * area.cos * area.k,
    y: area.oy + (area.maxLat - lat) * area.k,
  };
}

/** Rayon d'un repère selon le nombre d'interventions du lieu (surface proportionnelle). */
export function markerRadius(count: number, max: number): number {
  return 5 + 9 * Math.sqrt(count / Math.max(max, 1));
}
