import { type ReactNode, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Svg, { Circle, Path, Text as SvgText } from 'react-native-svg';

import { FRANCE_MAP, markerRadius, projectPlace } from '@/lib/franceMap';
import { colors } from '@/theme/colors';

export interface MapPlace {
  key: string;
  label: string;
  lat: number;
  lon: number;
  approximate: boolean;
  interventions: { id: string }[];
}

/** Largeur de la fiche d'un lieu, et écart avec son repère. */
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
  return {
    left: clamp(marker.x - popWidth / 2, width - popWidth),
    top: below + popHeight <= height || above < 0 ? below : above,
  };
}

/**
 * Carte de France des déplacements (spec intervention-places, design D5) : fond intégré
 * à l'app, aux couleurs de la charte, sans service tiers. Un repère par lieu ; la fiche
 * du lieu choisi (`children`) s'ouvre à côté de son repère.
 */
export function CampaignMap({
  places,
  selectedKey,
  onSelect,
  onClose,
  children,
}: {
  places: MapPlace[];
  selectedKey: string | null;
  onSelect: (place: MapPlace) => void;
  onClose: () => void;
  /** Fiche du lieu choisi. */
  children?: ReactNode;
}) {
  const [width, setWidth] = useState(0);
  const [available, setAvailable] = useState(0);
  const [popHeight, setPopHeight] = useState(0);
  // La carte est centrée dans son conteneur : décalage des zones tactiles.
  const [offset, setOffset] = useState(0);
  const max = Math.max(1, ...places.map((p) => p.interventions.length));
  // Les plus grands d'abord : les petits repères restent visibles par-dessus.
  const markers = places
    .flatMap((place) => {
      const at = projectPlace(place.lat, place.lon);
      return at ? [{ place, ...at, r: markerRadius(place.interventions.length, max) }] : [];
    })
    .sort((a, b) => b.r - a.r);
  const height = (width * FRANCE_MAP.height) / FRANCE_MAP.width;

  return (
    <View
      onLayout={(e) => {
        const full = e.nativeEvent.layout.width;
        const w = Math.min(full, 640);
        setWidth(w);
        setAvailable(full);
        setOffset((full - w) / 2);
      }}
      className="w-full items-center"
      accessibilityLabel="Carte de France des déplacements"
    >
      {width > 0 ? (
        <Svg width={width} height={height} viewBox={`0 0 ${FRANCE_MAP.width} ${FRANCE_MAP.height}`}>
          {FRANCE_MAP.regions.map((region) => (
            <Path
              key={region.code}
              d={region.d}
              fill={colors.bleu}
              stroke={colors.blanc}
              strokeOpacity={0.18}
              strokeWidth={0.8}
            />
          ))}
          {FRANCE_MAP.areas.slice(1).map((area) => (
            <SvgText
              key={area.name}
              x={area.ox}
              y={FRANCE_MAP.height - 2}
              fill={colors.blanc}
              fillOpacity={0.55}
              fontSize={9}
            >
              {area.name}
            </SvgText>
          ))}
          {markers.map(({ place, x, y, r }) => {
            const selected = place.key === selectedKey;
            return (
              <Circle
                key={place.key}
                cx={x}
                cy={y}
                r={r}
                fill={colors.chamois}
                fillOpacity={place.approximate ? 0.45 : 0.85}
                stroke={selected ? colors.blanc : colors.bleuSombre}
                strokeWidth={selected ? 2.5 : 1.2}
                strokeDasharray={place.approximate ? '3 2' : undefined}
              />
            );
          })}
        </Svg>
      ) : null}
      {/* Toucher la carte hors d'un repère ferme la fiche. */}
      {children && width > 0 ? (
        <Pressable
          accessibilityLabel="Fermer la fiche du lieu"
          onPress={onClose}
          style={{ position: 'absolute', left: offset, top: 0, width, height }}
        />
      ) : null}
      {/* Zones tactiles en vues : sur le web, les gestionnaires d'évènements du SVG ne
          sont pas pris en charge. Taille minimale de 24 px autour des petits repères. */}
      {width > 0
        ? markers.map(({ place, x, y, r }) => {
            const scale = width / FRANCE_MAP.width;
            const size = Math.max(2 * r * scale, 24);
            return (
              <Pressable
                key={place.key}
                accessibilityRole="button"
                accessibilityLabel={`${place.label}, ${place.interventions.length} intervention${place.interventions.length > 1 ? 's' : ''}`}
                onPress={() => onSelect(place)}
                style={{
                  position: 'absolute',
                  left: offset + x * scale - size / 2,
                  top: y * scale - size / 2,
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                }}
              />
            );
          })
        : null}
      {children && width > 0
        ? (() => {
            const marker = markers.find((m) => m.place.key === selectedKey);
            if (!marker) return null;
            const scale = width / FRANCE_MAP.width;
            const popWidth = Math.min(POPOVER_WIDTH, available);
            // À côté du repère, en débordant à droite de la carte s'il y a de la place.
            const at = popoverPosition(
              { x: offset + marker.x * scale, y: marker.y * scale, r: marker.r * scale },
              { width: available, height, popWidth, popHeight },
            );
            return (
              <View
                onLayout={(e) => setPopHeight(e.nativeEvent.layout.height)}
                style={{ position: 'absolute', ...at, width: popWidth, maxHeight: height }}
              >
                <ScrollView>{children}</ScrollView>
              </View>
            );
          })()
        : null}
    </View>
  );
}
