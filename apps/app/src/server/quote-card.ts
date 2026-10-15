/**
 * Mise en page de l'image d'une citation (spec intervention-quotes, ADR 0029), modèle
 * « encadré » : arbre d'éléments au format de satori, sans dépendance, testé à part.
 * Palette et police de la charte (ADR 0001) ; ni logo, ni photo, ni miniature.
 */
import { APP_NAME, INDEPENDENCE_NOTICE } from '../config/app';
import { formatDate, formatTimestamp, THEME_LABELS, type Theme } from '../lib/format';
import { blancSecondaire, colors } from '../theme/colors';

export const CARD_SIZE = 1080;

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

/** Taille du texte selon sa longueur : une phrase courte en grand, une longue tient. */
export function quoteFontSize(text: string): number {
  if (text.length < 90) return 66;
  if (text.length < 150) return 54;
  if (text.length < 190) return 46;
  return 40;
}

export function quoteCard(q: QuoteCardData): CardNode {
  const date = formatDate(`${q.day}T12:00:00Z`);
  // Sa propre chaîne : la date seule, son nom figure déjà en signature.
  const header = (q.official ? date : `${q.outlet} · ${date}`).toUpperCase();
  const theme = q.theme && q.theme in THEME_LABELS ? THEME_LABELS[q.theme as Theme] : null;
  const progress =
    q.durationS && q.durationS > 0 ? Math.min(1, Math.max(0, q.startS / q.durationS)) : null;
  const rule = el({ width: 56, height: 3, background: colors.chamois });

  return el(
    {
      width: CARD_SIZE,
      height: CARD_SIZE,
      padding: 44,
      background: colors.bleuSombre,
      color: colors.blanc,
      fontFamily: 'Montserrat',
    },
    el(
      {
        flex: 1,
        flexDirection: 'column',
        border: `3px solid ${colors.chamois}`,
        padding: '48px 64px 32px',
        background: `linear-gradient(160deg, ${colors.bleu}, ${colors.bleuSombre})`,
      },
      el(
        { justifyContent: 'space-between', alignItems: 'center' },
        el({ fontSize: 22, fontWeight: 700, letterSpacing: 5, color: colors.chamois }, header),
        ...(theme
          ? [
              el(
                {
                  fontSize: 20,
                  fontWeight: 700,
                  letterSpacing: 3,
                  color: colors.chamois,
                  border: `2px solid ${colors.chamois}`,
                  borderRadius: 999,
                  padding: '7px 20px',
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
            fontSize: 140,
            fontWeight: 800,
            color: colors.chamois,
            lineHeight: 1,
            marginBottom: -16,
          },
          '“',
        ),
        el(
          {
            fontSize: quoteFontSize(q.text),
            fontWeight: 700,
            lineHeight: 1.24,
            textAlign: 'center',
          },
          q.text,
        ),
        el(
          { alignItems: 'center', marginTop: 40 },
          rule,
          el(
            { fontSize: 32, fontWeight: 800, letterSpacing: 4, margin: '0 20px' },
            'DAVID LISNARD',
          ),
          rule,
        ),
      ),
      el(
        { flexDirection: 'column', marginTop: 24, marginBottom: 24 },
        el(
          {
            justifyContent: 'space-between',
            fontSize: 21,
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
          paddingTop: 18,
        },
        el(
          { justifyContent: 'space-between', alignItems: 'center' },
          el({ fontSize: 24, fontWeight: 800, letterSpacing: 5 }, APP_NAME.toUpperCase()),
          el({ fontSize: 23, fontWeight: 700, color: colors.chamois }, q.host),
        ),
        el({ fontSize: 16, color: blancSecondaire, marginTop: 8 }, INDEPENDENCE_NOTICE),
      ),
    ),
  );
}
