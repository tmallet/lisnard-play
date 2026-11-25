import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { formatDate } from '@/lib/format';
import { FRANCE_MAP, markerRadius, projectPlace } from '@/lib/franceMap';
import { colors } from '@/theme/colors';

export interface MapPlace {
  key: string;
  label: string;
  lat: number;
  lon: number;
  approximate: boolean;
  interventions: { id: string; title: string; outlet: string; day: string }[];
}

/** Largeur maximale de la carte, de la fiche d'un lieu, et écart avec son repère. */
const MAP_MAX = 640;
const POPOVER_WIDTH = 280;
const GAP = 8;

/**
 * Position de la fiche d'un lieu, sans masquer son repère : à droite, sinon à gauche,
 * verticalement centrée sur lui ; faute de place sur les côtés (téléphone), dessous,
 * sinon dessus, calée horizontalement dans le conteneur. Pixels du conteneur.
 */
export function popoverPosition(
  marker: { x: number; y: number; r: number },
  box: { width: number; height: number; popWidth: number; popHeight: number },
) {
  const { width, height, popWidth, popHeight } = box;
  const clamp = (v: number, max: number) => Math.min(Math.max(v, 0), Math.max(max, 0));
  const right = marker.x + marker.r + GAP;
  const left = marker.x - marker.r - GAP - popWidth;
  if (right + popWidth <= width || left >= 0)
    return {
      left: right + popWidth <= width ? right : left,
      top: clamp(marker.y - popHeight / 2, height - popHeight),
    };
  const below = marker.y + marker.r + GAP;
  const above = marker.y - marker.r - GAP - popHeight;
  const top =
    below + popHeight <= height
      ? below
      : above >= 0
        ? above
        : clamp(height - marker.y > marker.y ? below : above, height - popHeight);
  return { left: clamp(marker.x - popWidth / 2, width - popWidth), top };
}

function PlaceCard({ place, onClose }: { place: MapPlace; onClose: () => void }) {
  // Le focus passe sur la fiche à son ouverture (clavier, lecteur d'écran), sans défiler.
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => close.current?.focus({ preventScroll: true }), []);
  const count = place.interventions.length;
  return (
    <div
      role="dialog"
      aria-label={place.label}
      className="flex flex-col gap-2 rounded-[20px] border border-blanc/25 bg-bleu-sombre p-3 shadow-lg"
    >
      <div className="flex items-start gap-2">
        <p className="flex-1 font-sans-semibold text-chamois text-xs uppercase tracking-wider">
          {place.label}
          {place.approximate ? ' (approximatif)' : ''} · {count}{' '}
          {count > 1 ? 'interventions' : 'intervention'}
        </p>
        <button
          ref={close}
          type="button"
          aria-label="Fermer"
          onClick={onClose}
          className="font-sans-bold text-base text-blanc/80 leading-none"
        >
          ×
        </button>
      </div>
      {place.interventions.map((item) => (
        <p key={item.id} className="flex flex-col gap-0.5">
          <span className="font-sans text-blanc/70 text-xs">
            {formatDate(`${item.day}T12:00:00Z`)} · {item.outlet}
          </span>
          <a
            href={`/interventions/${item.id}`}
            className="font-sans-semibold text-chamois text-sm underline"
          >
            {item.title}
          </a>
        </p>
      ))}
    </div>
  );
}

/**
 * Carte de France des déplacements (spec intervention-places, ADR 0027) : fond intégré au
 * site, aux couleurs de la charte, sans service tiers. Un repère par lieu, placé en
 * pourcentage (rendu serveur sans mesure) ; la fiche du lieu s'ouvre à côté de son repère.
 */
export default function TravelsMap({ places }: { places: MapPlace[] }) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const close = useCallback(() => setSelectedKey(null), []);
  const container = useRef<HTMLDivElement>(null);
  const popover = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);

  const max = Math.max(1, ...places.map((p) => p.interventions.length));
  // Les plus grands d'abord : les petits repères restent visibles par-dessus.
  const markers = places
    .flatMap((place) => {
      const at = projectPlace(place.lat, place.lon);
      return at ? [{ place, ...at, r: markerRadius(place.interventions.length, max) }] : [];
    })
    .sort((a, b) => b.r - a.r);
  const selected = markers.find((m) => m.place.key === selectedKey) ?? null;

  // Échap ferme la fiche.
  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected, close]);

  // Position de la fiche, mesurée avant affichage pour ne pas sauter d'une position à
  // l'autre ; recalculée seulement quand le lieu change (`selected` est recréé à chaque rendu).
  // biome-ignore lint/correctness/useExhaustiveDependencies: dépend du lieu, pas de l'objet
  useLayoutEffect(() => {
    const box = container.current;
    const pop = popover.current;
    if (!selected || !box || !pop) {
      setPosition(null);
      return;
    }
    const available = box.clientWidth;
    const width = Math.min(available, MAP_MAX);
    const scale = width / FRANCE_MAP.width;
    const height = FRANCE_MAP.height * scale;
    const offset = (available - width) / 2;
    const popWidth = Math.min(POPOVER_WIDTH, available);
    setPosition(
      popoverPosition(
        { x: offset + selected.x * scale, y: selected.y * scale, r: selected.r * scale },
        { width: available, height, popWidth, popHeight: Math.min(pop.offsetHeight, height) },
      ),
    );
  }, [selectedKey]);

  return (
    <div ref={container} className="relative w-full">
      <div className="relative mx-auto w-full" style={{ maxWidth: MAP_MAX }}>
        <svg
          viewBox={`0 0 ${FRANCE_MAP.width} ${FRANCE_MAP.height}`}
          className="block h-auto w-full"
          role="img"
          aria-label="Carte de France des déplacements"
        >
          {FRANCE_MAP.regions.map((region) => (
            <path
              key={region.code}
              d={region.d}
              fill={colors.bleu}
              stroke={colors.blanc}
              strokeOpacity={0.18}
              strokeWidth={0.8}
            />
          ))}
          {FRANCE_MAP.areas.slice(1).map((area) => (
            <text
              key={area.name}
              x={area.ox}
              y={FRANCE_MAP.height - 2}
              fill={colors.blanc}
              fillOpacity={0.55}
              fontSize={9}
            >
              {area.name}
            </text>
          ))}
          {markers.map(({ place, x, y, r }) => {
            const isSelected = place.key === selectedKey;
            return (
              <circle
                key={place.key}
                cx={x}
                cy={y}
                r={r}
                fill={colors.chamois}
                fillOpacity={place.approximate ? 0.45 : 0.85}
                stroke={isSelected ? colors.blanc : colors.bleuSombre}
                strokeWidth={isSelected ? 2.5 : 1.2}
                strokeDasharray={place.approximate ? '3 2' : undefined}
              />
            );
          })}
        </svg>
        {/* Toucher la carte hors d'un repère ferme la fiche. */}
        {selected ? (
          <button
            type="button"
            aria-label="Fermer la fiche du lieu"
            onClick={close}
            className="absolute inset-0 cursor-default"
          />
        ) : null}
        {/* Zones tactiles d'au moins 24 px autour des petits repères. */}
        {markers.map(({ place, x, y, r }) => {
          const count = place.interventions.length;
          return (
            <button
              key={place.key}
              type="button"
              aria-label={`${place.label}, ${count} intervention${count > 1 ? 's' : ''}`}
              aria-expanded={place.key === selectedKey}
              onClick={() => setSelectedKey(place.key)}
              className="absolute min-h-6 min-w-6 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                left: `${(x / FRANCE_MAP.width) * 100}%`,
                top: `${(y / FRANCE_MAP.height) * 100}%`,
                width: `${((2 * r) / FRANCE_MAP.width) * 100}%`,
                aspectRatio: '1',
              }}
            />
          );
        })}
      </div>
      {selected ? (
        <div
          ref={popover}
          className="absolute overflow-y-auto"
          style={{
            width: Math.min(POPOVER_WIDTH, container.current?.clientWidth ?? POPOVER_WIDTH),
            left: position?.left ?? 0,
            top: position?.top ?? 0,
            maxHeight: '100%',
            visibility: position ? 'visible' : 'hidden',
          }}
        >
          <PlaceCard key={selected.place.key} place={selected.place} onClose={close} />
        </div>
      ) : null}
    </div>
  );
}
