/**
 * Mise en page de l'image d'une citation (spec intervention-quotes, ADR 0029), modèle
 * « encadré » : arbre d'éléments au format de satori, sans dépendance, testé à part.
 * Palette et police de la charte (ADR 0001) ; ni logo, ni photo, ni miniature.
 */
import { APP_NAME, INDEPENDENCE_NOTICE } from '../config/app';
import { formatDate, formatTimestamp, THEME_LABELS, type Theme } from '../lib/format';
import { blancSecondaire, colors } from '../theme/colors';

/**
 * Formats : carré pour « Partager en image » (WhatsApp, Instagram), paysage pour les
 * aperçus de lien (X, Facebook, LinkedIn ; ADR 0030). Même composition, tailles adaptées.
 */
export type CardFormat = 'square' | 'landscape';

const SIZES = {
  square: {
    width: 1080,
    height: 1080,
    outer: 44,
    inner: '48px 64px 32px',
    header: 22,
    pill: 20,
    pillPadding: '7px 20px',
    mark: 140,
    markOverlap: -16,
    quoteScale: 1,
    signatureGap: 40,
    signature: 32,
    rule: 56,
    barGap: 24,
    bar: 21,
    footerGap: 18,
    name: 24,
    host: 23,
    notice: 16,
  },
  landscape: {
    width: 1200,
    height: 630,
    outer: 26,
    inner: '26px 48px 18px',
    header: 16,
    pill: 15,
    pillPadding: '5px 14px',
    mark: 84,
    markOverlap: -12,
    quoteScale: 0.74,
    signatureGap: 18,
    signature: 22,
    rule: 44,
    barGap: 12,
    bar: 16,
    footerGap: 10,
    name: 17,
    host: 17,
    notice: 13,
  },
} as const;

export const cardSize = (format: CardFormat) => ({
  width: SIZES[format].width,
  height: SIZES[format].height,
});

export interface QuoteCardData {
  text: string;
  outlet: string;
  official: boolean;
  /** Jour de l'intervention (AAAA-MM-JJ, heure de Paris). */
  day: string;
  startS: number;
  durationS: number | null;
  theme: string | null;
  /** Domaine affiché en pied d'image (celui par lequel l'image est servie). */
  host: string;
}

export interface CardNode {
  type: string;
  props: { style: Record<string, unknown>; children?: CardNode | string | (CardNode | string)[] };
}

const el = (style: Record<string, unknown>, ...children: (CardNode | string)[]): CardNode => ({
  type: 'div',
  props: {
    style: { display: 'flex', ...style },
    children: children.length === 1 ? children[0] : children,
  },
});

/** Montserrat n'a pas d'emoji : ils sont retirés plutôt que dessinés en carrés vides. */
export const withoutEmoji = (text: string) =>
  text
    .replace(
      /\p{Extended_Pictographic}|\p{Emoji_Modifier}|\p{Regional_Indicator}|\u{FE0F}|\u{200D}/gu,
      '',
    )
    .replace(/\s{2,}/g, ' ')
    .trim();

/** Taille du texte selon sa longueur : une phrase courte en grand, une longue tient. */
export function quoteFontSize(text: string): number {
  if (text.length < 90) return 66;
  if (text.length < 150) return 54;
  if (text.length < 190) return 46;
  return 40;
}

export function quoteCard(input: QuoteCardData, format: CardFormat = 'square'): CardNode {
  const z = SIZES[format];
  const q = { ...input, text: withoutEmoji(input.text) };
  const date = formatDate(`${q.day}T12:00:00Z`);
  // Date d'abord : un nom de média long peut être coupé, jamais la date. Sa propre
  // chaîne : la date seule, son nom figure déjà en signature.
  const header = (q.official ? date : `${date} · ${q.outlet}`).toUpperCase();
  const theme = q.theme && q.theme in THEME_LABELS ? THEME_LABELS[q.theme as Theme] : null;
  const progress =
    q.durationS && q.durationS > 0 ? Math.min(1, Math.max(0, q.startS / q.durationS)) : null;
  const rule = el({ width: z.rule, height: 3, background: colors.chamois });

  return el(
    {
      width: z.width,
      height: z.height,
      padding: z.outer,
      background: colors.bleuSombre,
      color: colors.blanc,
      fontFamily: 'Montserrat',
    },
    el(
      {
        flex: 1,
        flexDirection: 'column',
        border: `3px solid ${colors.chamois}`,
        padding: z.inner,
        background: `linear-gradient(160deg, ${colors.bleu}, ${colors.bleuSombre})`,
      },
      el(
        { justifyContent: 'space-between', alignItems: 'center' },
        // Un nom de média long est coupé plutôt que de chevaucher la pastille du thème.
        el(
          {
            flex: 1,
            marginRight: 24,
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
            fontSize: z.header,
            fontWeight: 700,
            letterSpacing: 5,
            color: colors.chamois,
          },
          header,
        ),
        ...(theme
          ? [
              el(
                {
                  fontSize: z.pill,
                  fontWeight: 700,
                  letterSpacing: 3,
                  color: colors.chamois,
                  border: `2px solid ${colors.chamois}`,
                  borderRadius: 999,
                  padding: z.pillPadding,
                },
                theme.toUpperCase(),
              ),
            ]
          : []),
      ),
      el(
        { flex: 1, flexDirection: 'column', justifyContent: 'center', alignItems: 'center' },
        el(
          {
            fontSize: z.mark,
            fontWeight: 800,
            color: colors.chamois,
            lineHeight: 1,
            marginBottom: z.markOverlap,
          },
          '“',
        ),
        el(
          {
            fontSize: Math.round(quoteFontSize(q.text) * z.quoteScale),
            fontWeight: 700,
            lineHeight: 1.24,
            textAlign: 'center',
          },
          q.text,
        ),
        el(
          { alignItems: 'center', marginTop: z.signatureGap },
          rule,
          el(
            { fontSize: z.signature, fontWeight: 800, letterSpacing: 4, margin: '0 20px' },
            'DAVID LISNARD',
          ),
          rule,
        ),
      ),
      el(
        { flexDirection: 'column', marginTop: z.barGap, marginBottom: z.barGap },
        el(
          {
            justifyContent: 'space-between',
            fontSize: z.bar,
            fontWeight: 600,
            color: blancSecondaire,
            marginBottom: 10,
          },
          el({}, `▶ Le passage à ${formatTimestamp(q.startS)}`),
          ...(progress !== null && q.durationS ? [el({}, formatTimestamp(q.durationS))] : []),
        ),
        ...(progress !== null
          ? [
              el(
                { height: 6, background: colors.bleu, borderRadius: 3 },
                el({
                  width: `${(progress * 100).toFixed(1)}%`,
                  height: 6,
                  background: colors.chamois,
                  borderRadius: 3,
                }),
              ),
            ]
          : []),
      ),
      el(
        {
          flexDirection: 'column',
          borderTop: `1px solid ${blancSecondaire}`,
          paddingTop: z.footerGap,
        },
        el(
          { justifyContent: 'space-between', alignItems: 'center' },
          el({ fontSize: z.name, fontWeight: 800, letterSpacing: 5 }, APP_NAME.toUpperCase()),
          el({ fontSize: z.host, fontWeight: 700, color: colors.chamois }, q.host),
        ),
        el({ fontSize: z.notice, color: blancSecondaire, marginTop: 6 }, INDEPENDENCE_NOTICE),
      ),
    ),
  );
}
