/**
 * Image d'un récapitulatif (spec campaign-recaps, ADR 0031) : 1200 × 630, aperçu des
 * liens. Même charte que les images de citation : palette, Montserrat, mention
 * d'indépendance ; ni logo ni photo. Mise en page pure, testée à part.
 */
import { APP_NAME, INDEPENDENCE_NOTICE } from '../config/app';
import { FRANCE_MAP, projectPlace } from '../lib/franceMap';
import {
  membersFigure,
  outletChips,
  periodLabel,
  type RecapPeriod,
  recapTitle,
} from '../lib/recap';
import { blancSecondaire, colors } from '../theme/colors';
import { type CardNode, el, withoutEmoji } from './quote-card';

export const RECAP_SIZE = { width: 1200, height: 630 } as const;

export interface RecapCardData {
  period: RecapPeriod;
  from: string;
  to: string;
  count: number;
  outlets: { name: string; official: boolean; count: number }[];
  places: { label: string; lat: number; lon: number }[];
  members: { total: number; delta: number | null; curve: { members: number }[] } | null;
  quote: { text: string; outlet: string; official: boolean } | null;
  host: string;
}

const svgImage = (svg: string, width: number, height: number): CardNode => ({
  type: 'img',
  props: {
    style: {},
    // Satori lit l'image depuis l'attribut src ; dimensions explicites.
    ...({
      src: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`,
      width,
      height,
    } as object),
  },
});

/** Courbe des adhérents, le dernier jour mis en évidence. */
export function curveSvg(values: number[], width: number, height: number): string {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = 10;
  const pts = values.map((v, i) => [
    pad +
      (values.length > 1 ? (i / (values.length - 1)) * (width - 2 * pad) : (width - 2 * pad) / 2),
    height - pad - ((v - min) / (max - min || 1)) * (height - 2 * pad),
  ]);
  const line = pts
    .map(([x, y], i) => `${i ? 'L' : 'M'}${x?.toFixed(1)},${y?.toFixed(1)}`)
    .join(' ');
  const [lx, ly] = pts.at(-1) ?? [0, 0];
  const [fx] = pts[0] ?? [0];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><path d="${line} L${lx},${height} L${fx},${height} Z" fill="${colors.chamois}" fill-opacity="0.16"/><path d="${line}" fill="none" stroke="${colors.chamois}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/><circle cx="${lx}" cy="${ly}" r="9" fill="${colors.blanc}" stroke="${colors.chamois}" stroke-width="4"/></svg>`;
}

/** Mini-carte des lieux, sur le fond de carte intégré (ADR 0027). */
export function mapSvg(places: { lat: number; lon: number }[], width: number): string {
  const height = Math.round((width * FRANCE_MAP.height) / FRANCE_MAP.width);
  const regions = FRANCE_MAP.regions
    .map(
      (r) =>
        `<path d="${r.d}" fill="${colors.bleu}" stroke="${colors.blanc}" stroke-opacity="0.55" stroke-width="1.6"/>`,
    )
    .join('');
  const markers = places
    .map((p) => projectPlace(p.lat, p.lon))
    .filter((p): p is { x: number; y: number } => p !== null)
    .map(
      (p) =>
        `<circle cx="${p.x}" cy="${p.y}" r="${(FRANCE_MAP.width * 0.05).toFixed(1)}" fill="${colors.chamois}" stroke="${colors.bleuSombre}" stroke-width="${(FRANCE_MAP.width * 0.012).toFixed(1)}"/>`,
    )
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${FRANCE_MAP.width} ${FRANCE_MAP.height}">${regions}${markers}</svg>`;
}

/** « Strasbourg · Benfeld · Cannes », puis « +N » au-delà de trois lieux. */
export function placeNames(places: { label: string }[]): string {
  // Un lieu sans nom garde son repère sur la carte, sans libellé.
  const named = places.filter((p) => p.label);
  const names = named.slice(0, 3).map((p) => p.label);
  return named.length > 3 ? `${names.join(' · ')} +${named.length - 3}` : names.join(' · ');
}

export function recapCard(r: RecapCardData): CardNode {
  const kicker =
    periodLabel(r.period, r.from, r.to).toUpperCase() +
    (r.period === 'day' ? ` ${r.from.slice(0, 4)}` : ` ${r.to.slice(0, 4)}`);
  const located = r.places.filter((p) => projectPlace(p.lat, p.lon) !== null);
  const quote = r.quote ? { ...r.quote, text: withoutEmoji(r.quote.text) } : null;
  const quoteSize = !quote ? 0 : quote.text.length < 90 ? 30 : quote.text.length < 160 ? 25 : 21;
  const chip = (text: string) =>
    el(
      {
        fontSize: 14,
        fontWeight: 600,
        background: colors.bleu,
        border: `1px solid ${blancSecondaire}`,
        borderRadius: 999,
        padding: '3px 11px',
      },
      text,
    );

  return el(
    {
      width: RECAP_SIZE.width,
      height: RECAP_SIZE.height,
      padding: 26,
      background: colors.bleuSombre,
      color: colors.blanc,
      fontFamily: 'Montserrat',
    },
    el(
      {
        flex: 1,
        flexDirection: 'column',
        border: `3px solid ${colors.chamois}`,
        padding: '26px 44px 16px',
        background: `linear-gradient(160deg, ${colors.bleu}, ${colors.bleuSombre})`,
      },
      el(
        { justifyContent: 'space-between', alignItems: 'flex-start' },
        el(
          { flexDirection: 'column' },
          el({ fontSize: 17, fontWeight: 700, letterSpacing: 4, color: colors.chamois }, kicker),
          el({ fontSize: 40, fontWeight: 800, marginTop: 6 }, recapTitle(r.period)),
        ),
        el(
          {
            fontSize: 15,
            fontWeight: 700,
            letterSpacing: 3,
            color: colors.chamois,
            border: `2px solid ${colors.chamois}`,
            borderRadius: 999,
            padding: '5px 14px',
          },
          r.period === 'day' ? 'RÉCAP DU JOUR' : 'RÉCAP DE LA SEMAINE',
        ),
      ),
      el(
        { marginTop: 20, gap: 28 },
        el(
          { flexDirection: 'column', width: 320 },
          el({ fontSize: 76, fontWeight: 800, lineHeight: 1 }, String(r.count)),
          el(
            { fontSize: 20, fontWeight: 600, color: blancSecondaire, marginTop: 4 },
            r.count > 1 ? 'interventions' : 'intervention',
          ),
          el({ flexWrap: 'wrap', gap: 8, marginTop: 14 }, ...outletChips(r.outlets).map(chip)),
        ),
        r.members
          ? el(
              { flexDirection: 'column', flex: 1 },
              el(
                // Avec la carte, la légende passe sous le nombre, qui ne se coupe jamais.
                located.length
                  ? { flexDirection: 'column', gap: 4 }
                  : { alignItems: 'flex-end', gap: 14 },
                el(
                  {
                    fontSize: 56,
                    fontWeight: 800,
                    color: colors.chamois,
                    lineHeight: 1,
                    whiteSpace: 'nowrap',
                  },
                  membersFigure(r.members).value,
                ),
                el(
                  {
                    fontSize: 20,
                    fontWeight: 600,
                    color: blancSecondaire,
                    marginBottom: 6,
                    whiteSpace: 'nowrap',
                  },
                  membersFigure(r.members).caption,
                ),
              ),
              ...(r.members.curve.length > 1
                ? [
                    el(
                      { marginTop: 12 },
                      svgImage(
                        curveSvg(
                          r.members.curve.map((p) => p.members),
                          located.length ? 330 : 660,
                          120,
                        ),
                        located.length ? 330 : 660,
                        120,
                      ),
                    ),
                  ]
                : []),
            )
          : el({ flex: 1 }),
        ...(located.length
          ? [
              // Carte sur un panneau plus sombre que le fond, pour qu'elle se détache.
              el(
                {
                  flexDirection: 'column',
                  alignItems: 'center',
                  width: 236,
                  padding: '10px 12px 8px',
                  background: colors.bleuSombre,
                  border: `1px solid ${colors.chamois}`,
                  borderRadius: 12,
                },
                svgImage(
                  mapSvg(located, 190),
                  190,
                  Math.round((190 * FRANCE_MAP.height) / FRANCE_MAP.width),
                ),
                el(
                  {
                    fontSize: 14,
                    fontWeight: 700,
                    color: colors.chamois,
                    marginTop: 6,
                    textAlign: 'center',
                    justifyContent: 'center',
                  },
                  placeNames(located),
                ),
              ),
            ]
          : []),
      ),
      el(
        { flex: 1, flexDirection: 'column', justifyContent: 'center', marginTop: 6 },
        ...(quote
          ? [
              el({ fontSize: quoteSize, fontWeight: 700, lineHeight: 1.25 }, `« ${quote.text} »`),
              el(
                { fontSize: 17, fontWeight: 600, color: colors.chamois, marginTop: 8 },
                `David Lisnard · ${quote.official ? 'sa chaîne' : quote.outlet}`,
              ),
            ]
          : []),
      ),
      el(
        {
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTop: `1px solid ${blancSecondaire}`,
          paddingTop: 10,
          gap: 16,
        },
        el({ fontSize: 17, fontWeight: 800, letterSpacing: 4 }, APP_NAME.toUpperCase()),
        el({ fontSize: 12, color: blancSecondaire }, INDEPENDENCE_NOTICE),
        el({ fontSize: 17, fontWeight: 700, color: colors.chamois }, r.host),
      ),
    ),
  );
}
