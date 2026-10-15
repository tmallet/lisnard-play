import { useState } from 'react';
import { Pressable, View } from 'react-native';
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

/**
 * Carte de France des déplacements (spec intervention-places, design D5) : fond intégré
 * à l'app, aux couleurs de la charte, sans service tiers. Un repère par lieu.
 */
export function CampaignMap({
  places,
  selectedKey,
  onSelect,
}: {
  places: MapPlace[];
  selectedKey: string | null;
  onSelect: (place: MapPlace) => void;
}) {
  const [width, setWidth] = useState(0);
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
        const available = e.nativeEvent.layout.width;
        const w = Math.min(available, 640);
        setWidth(w);
        setOffset((available - w) / 2);
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
                accessibilityLabel={`${place.label}, ${place.interventions.length} interventions`}
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
    </View>
  );
}
