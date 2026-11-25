import { useEffect, useRef, useState } from 'react';

import { CardImage } from '@/components/InterventionCard';
import { formatDate } from '@/lib/format';
import {
  type Day,
  layoutTimeline,
  type Marker,
  smallThumbnail,
  type TimelineIntervention,
} from '@/lib/timeline';
import { colors } from '@/theme/colors';

const AXIS_WIDTH = 40;
const members = new Intl.NumberFormat('fr-FR');

function MarkerButton({
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
    <button
      type="button"
      aria-label={label}
      aria-pressed={selected}
      onClick={() => onPress(marker)}
      onMouseEnter={() => onHover(marker)}
      onFocus={() => onHover(marker)}
      className="absolute flex items-center justify-center overflow-hidden rounded-full p-0"
      style={{
        left: marker.x - size / 2,
        top: marker.y - size / 2,
        width: size,
        height: size,
        borderStyle: 'solid',
        borderWidth: selected ? 3 : 2,
        borderColor: selected ? colors.blanc : ring,
        backgroundColor: thumbnail || marker.type === 'more' ? colors.bleu : ring,
      }}
    >
      {thumbnail ? (
        <img src={smallThumbnail(thumbnail)} alt="" className="h-full w-full object-cover" />
      ) : marker.type === 'more' ? (
        <span className="font-sans-bold text-[9px] text-chamois">+{marker.items.length}</span>
      ) : null}
    </button>
  );
}

/**
 * Courbe du total d'adhérents et interventions posées dessus (spec membership-timeline).
 * Le graphique défile horizontalement et s'ouvre sur les jours les plus récents.
 */
function Chart({
  days,
  interventions,
  selectedKey,
  onPress,
  onHover,
}: {
  days: Day[];
  interventions: TimelineIntervention[];
  selectedKey: string | null;
  onPress: (marker: Marker) => void;
  onHover: (marker: Marker) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  // Largeur inconnue au rendu serveur : un jour par pas fixe, puis la largeur réelle.
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const node = box.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry?.contentRect.width ?? 0));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  // Ouverture sur les jours récents, une seule fois : un rafraîchissement ne doit pas
  // ramener à la fin un lecteur remonté dans le temps.
  const openedAtEnd = useRef(false);
  useEffect(() => {
    const node = scroller.current;
    if (!node || openedAtEnd.current || width === 0) return;
    openedAtEnd.current = true;
    node.scrollLeft = node.scrollWidth;
  }, [width]);
  const layout = layoutTimeline(days, interventions, Math.max(width - AXIS_WIDTH, 0));
  if (!layout) return null;
  return (
    <figure
      ref={box}
      className="flex"
      aria-label="Graphique du nombre d’adhérents et des interventions"
    >
      <div className="relative shrink-0" style={{ width: AXIS_WIDTH, height: layout.height }}>
        {layout.ticks.map((tick) => (
          <span
            key={tick.value}
            className="absolute right-1.5 font-sans text-blanc/70 text-xs"
            style={{ top: tick.y - 8 }}
          >
            {tick.label}
          </span>
        ))}
      </div>
      <div ref={scroller} className="overflow-x-auto">
        <div className="relative" style={{ width: layout.width, height: layout.height }}>
          <svg
            width={layout.width}
            height={layout.height}
            aria-hidden="true"
            className="absolute inset-0"
          >
            <defs>
              <linearGradient id="aire" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={colors.chamois} stopOpacity={0.35} />
                <stop offset="1" stopColor={colors.chamois} stopOpacity={0} />
              </linearGradient>
            </defs>
            {layout.ticks.map((tick) => (
              <line
                key={tick.value}
                x1={0}
                x2={layout.width}
                y1={tick.y}
                y2={tick.y}
                stroke={colors.blanc}
                strokeOpacity={0.12}
              />
            ))}
            <path d={layout.area} fill="url(#aire)" />
            <path d={layout.line} stroke={colors.chamois} strokeWidth={2.5} fill="none" />
          </svg>
          {layout.months.map((month) => (
            <span
              key={`${month.label}-${month.x}`}
              className="absolute bottom-1 font-sans-semibold text-blanc/70 text-xs"
              style={{ left: month.x }}
            >
              {month.label}
            </span>
          ))}
          {layout.markers.map((marker) => (
            <MarkerButton
              key={marker.key}
              marker={marker}
              selected={marker.key === selectedKey}
              onPress={onPress}
              onHover={onHover}
            />
          ))}
        </div>
      </div>
    </figure>
  );
}

const meta = (item: TimelineIntervention) => `${item.outlet}${item.live ? ' · direct' : ''}`;

/** Repère choisi : l'intervention, ou la liste du « +N », avec le total ce jour-là. */
function TimelineCard({ marker }: { marker: Marker }) {
  const day = `${formatDate(`${marker.day}T12:00:00Z`)} · ${members.format(marker.members)} adhérents ce jour-là`;
  const link = 'font-sans-semibold text-chamois text-sm underline';
  if (marker.type === 'more')
    return (
      <div className="flex flex-col gap-2 rounded-[20px] border border-blanc/15 bg-blanc/5 p-3">
        <p className="font-sans-semibold text-chamois text-xs uppercase tracking-wider">{day}</p>
        {marker.items.map((item) => (
          <p key={item.id} className="flex flex-col gap-0.5">
            <span className="font-sans text-blanc/70 text-xs">{meta(item)}</span>
            <a href={`/interventions/${item.id}`} className={link}>
              {item.title}
            </a>
          </p>
        ))}
      </div>
    );
  const { item } = marker;
  return (
    <div className="flex gap-3 rounded-[20px] border border-blanc/15 bg-blanc/5 p-3">
      {item.thumbnailUrl ? (
        <CardImage
          url={item.thumbnailUrl}
          className="aspect-video w-28 shrink-0 self-start rounded-lg bg-bleu object-cover"
        />
      ) : null}
      <div className="flex flex-1 flex-col gap-1">
        <p className="font-sans-semibold text-chamois text-xs uppercase tracking-wider">
          {meta(item)}
        </p>
        <p className="line-clamp-2 font-sans-bold text-base text-blanc leading-snug">
          {item.title}
        </p>
        <p className="font-sans text-blanc/70 text-sm">{day}</p>
        <a href={`/interventions/${item.id}`} className={link}>
          Voir l’intervention
        </a>
      </div>
    </div>
  );
}

/**
 * Graphique de la vue « Adhésions » (spec membership-timeline, ADR 0026) : rendu par le
 * serveur, puis interactif. Un repère cliqué reste sélectionné : survoler d'autres repères
 * en allant vers le lien de la fiche ne doit pas la changer.
 */
export default function MembershipView({
  days,
  interventions,
}: {
  days: Day[];
  interventions: TimelineIntervention[];
}) {
  const [selected, setSelected] = useState<Marker | null>(null);
  const [pinned, setPinned] = useState(false);
  return (
    <div className="flex flex-col gap-4">
      <Chart
        days={days}
        interventions={interventions}
        selectedKey={selected?.key ?? null}
        onPress={(marker) => {
          setSelected(marker);
          setPinned(true);
        }}
        onHover={(marker) => {
          if (!pinned) setSelected(marker);
        }}
      />
      <div aria-live="polite">
        {selected ? (
          <TimelineCard marker={selected} />
        ) : (
          <p className="font-sans text-blanc/70 text-sm">
            Touchez un repère pour voir l’intervention.
          </p>
        )}
      </div>
    </div>
  );
}
