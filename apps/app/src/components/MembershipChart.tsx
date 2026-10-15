import { useRef, useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import Svg, { Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';

import {
  type Day,
  layoutTimeline,
  type Marker,
  smallThumbnail,
  type TimelineIntervention,
} from '@/lib/timeline';
import { colors } from '@/theme/colors';

const AXIS_WIDTH = 40;

/**
 * Courbe du total d'adhérents et interventions posées dessus (spec membership-timeline,
 * design D4). Le tracé est en SVG ; les repères sont des vues, plus simples à toucher.
 * Le graphique défile horizontalement et s'ouvre sur les jours les plus récents.
 */
export function MembershipChart({
  days,
  interventions,
  selectedKey,
  onPress,
  onHover,
}: {
  days: Day[];
  interventions: TimelineIntervention[];
  selectedKey: string | null;
  /** Toucher ou cliquer : sélection fixée. */
  onPress: (marker: Marker) => void;
  /** Survol (web) : aperçu, tant qu'aucun repère n'a été cliqué. */
  onHover: (marker: Marker) => void;
}) {
  const [visibleWidth, setVisibleWidth] = useState(0);
  const scroll = useRef<ScrollView>(null);
  // Ouverture sur les jours récents, une seule fois : un rafraîchissement ou une rotation
  // ne doit pas ramener à la fin un lecteur remonté dans le temps.
  const openedAtEnd = useRef(false);
  const layout = layoutTimeline(days, interventions, Math.max(visibleWidth - AXIS_WIDTH, 0));

  return (
    <View
      className="flex-row"
      onLayout={(event) => setVisibleWidth(event.nativeEvent.layout.width)}
      accessibilityLabel="Graphique du nombre d’adhérents et des interventions"
    >
      {layout ? (
        <>
          <View style={{ width: AXIS_WIDTH, height: layout.height }}>
            {layout.ticks.map((tick) => (
              <Text
                key={tick.value}
                className="absolute right-1.5 font-sans text-blanc/70 text-xs"
                style={{ top: tick.y - 8 }}
              >
                {tick.label}
              </Text>
            ))}
          </View>
          <ScrollView
            ref={scroll}
            horizontal
            showsHorizontalScrollIndicator
            // Après la mise en page : sur le web, un défilement immédiat serait ignoré.
            onContentSizeChange={(width) => {
              if (openedAtEnd.current || width <= 0) return;
              openedAtEnd.current = true;
              requestAnimationFrame(() => scroll.current?.scrollToEnd({ animated: false }));
            }}
          >
            <View style={{ width: layout.width, height: layout.height }}>
              <Svg width={layout.width} height={layout.height}>
                <Defs>
                  <LinearGradient id="aire" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor={colors.chamois} stopOpacity={0.35} />
                    <Stop offset="1" stopColor={colors.chamois} stopOpacity={0} />
                  </LinearGradient>
                </Defs>
                {layout.ticks.map((tick) => (
                  <Line
                    key={tick.value}
                    x1={0}
                    x2={layout.width}
                    y1={tick.y}
                    y2={tick.y}
                    stroke={colors.blanc}
                    strokeOpacity={0.12}
                  />
                ))}
                <Path d={layout.area} fill="url(#aire)" />
                <Path d={layout.line} stroke={colors.chamois} strokeWidth={2.5} fill="none" />
              </Svg>
              {layout.months.map((month) => (
                <Text
                  key={`${month.label}-${month.x}`}
                  className="absolute bottom-1 font-sans-semibold text-blanc/70 text-xs"
                  style={{ left: month.x }}
                >
                  {month.label}
                </Text>
              ))}
              {layout.markers.map((marker) => (
                <MarkerView
                  key={marker.key}
                  marker={marker}
                  selected={marker.key === selectedKey}
                  onPress={onPress}
                  onHover={onHover}
                />
              ))}
            </View>
          </ScrollView>
        </>
      ) : null}
    </View>
  );
}

function MarkerView({
  marker,
  selected,
  onPress,
  onHover,
}: {
  marker: Marker;
  selected: boolean;
  onPress: (marker: Marker) => void;
  onHover: (marker: Marker) => void;
}) {
  const { size } = marker;
  const item = marker.type === 'item' ? marker.item : null;
  const thumbnail = item?.official && item.thumbnailUrl ? item.thumbnailUrl : null;
  const ring = item?.live ? colors.emeraude : colors.chamois;
  const label =
    marker.type === 'item'
      ? `${marker.item.title}, ${marker.item.outlet}`
      : `${marker.items.length} autres interventions ce jour-là`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => onPress(marker)}
      onHoverIn={() => onHover(marker)}
      hitSlop={4}
      style={{
        position: 'absolute',
        left: marker.x - size / 2,
        top: marker.y - size / 2,
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: selected ? 3 : 2,
        borderColor: selected ? colors.blanc : ring,
        backgroundColor: thumbnail || marker.type === 'more' ? colors.bleu : ring,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {thumbnail ? (
        <Image
          source={{ uri: smallThumbnail(thumbnail) }}
          accessibilityIgnoresInvertColors
          style={{ width: '100%', height: '100%' }}
          resizeMode="cover"
        />
      ) : marker.type === 'more' ? (
        <Text className="font-sans-bold text-[9px] text-chamois">+{marker.items.length}</Text>
      ) : null}
    </Pressable>
  );
}
