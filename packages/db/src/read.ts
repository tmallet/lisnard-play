/**
 * Lecture publique (backend, ADR 0017) : uniquement les interventions publiées,
 * sans aucune donnée interne (probabilités, seuils, journal).
 */
import { and, desc, eq, type SQL, sql } from 'drizzle-orm';

import type { Db } from './client';
import {
  isTheme,
  item,
  type MediaRender,
  quote,
  type SummaryRecord,
  source,
  type Theme,
} from './schema';

export { THEMES, type Theme } from './schema';

export type TemporalStatus = 'live' | 'upcoming' | 'past';

export interface InterventionSummary {
  id: string;
  title: string;
  outlet: string;
  kind: string | null;
  /** Thèmes de campagne, éventuellement aucun (spec intervention-themes). */
  themes: Theme[];
  status: TemporalStatus;
  /** Début de diffusion, sinon publication (ISO 8601). */
  date: string;
  thumbnailUrl: string | null;
}

/** Résumé affichable (spec intervention-summaries) : ni modèle ni consigne exposés. */
export interface PublicSummary {
  text: string;
  points: string[];
}

/** Citation horodatée d'une vidéo (spec intervention-quotes). */
export interface PublicQuote {
  text: string;
  startS: number;
  theme: string | null;
}

export interface InterventionDetail extends InterventionSummary {
  description: string;
  quotes: PublicQuote[];
  url: string;
  media: MediaRender;
  summary: PublicSummary | null;
}

function toPublicSummary(summary: SummaryRecord | null): PublicSummary | null {
  return summary?.kind === 'ok' ? { text: summary.text, points: summary.points } : null;
}

export interface ListOptions {
  status: TemporalStatus;
  theme?: Theme;
  cursor?: string;
  limit: number;
  now?: Date;
}

const sortDate = sql<Date>`coalesce(${item.startsAt}, ${item.publishedAt})`;

/** Statut temporel calculé au moment de la requête (spec intervention-feed). */
export function temporalStatus(
  row: { liveStatus: string; startsAt: Date | null },
  now: Date,
): TemporalStatus {
  if (row.liveStatus === 'live') return 'live';
  if (row.liveStatus === 'upcoming' && row.startsAt && row.startsAt > now) return 'upcoming';
  return 'past';
}

function statusCondition(status: TemporalStatus, now: Date): SQL {
  const live = sql`${item.liveStatus} = 'live'`;
  const upcoming = sql`(${item.liveStatus} = 'upcoming' and ${item.startsAt} > ${now})`;
  if (status === 'live') return live;
  if (status === 'upcoming') return upcoming;
  return sql`not (${live}) and not ${upcoming}`;
}

interface Cursor {
  d: string;
  i: string;
}

export function encodeCursor(c: Cursor): string {
  return Buffer.from(JSON.stringify(c)).toString('base64url');
}

export function decodeCursor(raw: string): Cursor | null {
  try {
    const c = JSON.parse(Buffer.from(raw, 'base64url').toString()) as Partial<Cursor>;
    return typeof c.d === 'string' && typeof c.i === 'string' && UUID.test(c.i)
      ? { d: c.d, i: c.i }
      : null;
  } catch {
    return null;
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const summaryColumns = {
  id: item.id,
  title: item.title,
  outlet: sql<string>`coalesce(${item.outlet}, ${source.name})`,
  kind: item.kind,
  themes: item.themes,
  liveStatus: item.liveStatus,
  startsAt: item.startsAt,
  date: sortDate,
  // Articles : image de l'éditeur (Open Graph) quand la collecte n'en fournit pas.
  thumbnailUrl: sql<string | null>`coalesce(${item.thumbnailUrl}, ${item.media}->'og'->>'image')`,
};

type SummaryRow = {
  id: string;
  title: string;
  outlet: string;
  kind: string | null;
  themes: string[];
  liveStatus: string;
  startsAt: Date | null;
  date: Date | string;
  thumbnailUrl: string | null;
};

function toSummary(row: SummaryRow, now: Date): InterventionSummary {
  return {
    id: row.id,
    title: row.title,
    outlet: row.outlet,
    kind: row.kind,
    // Valeurs inconnues ignorées : la liste peut évoluer avant un reclassement.
    themes: row.themes.filter(isTheme),
    status: temporalStatus(row, now),
    date: new Date(row.date).toISOString(),
    thumbnailUrl: row.thumbnailUrl,
  };
}

/** Intervention posée sur le graphique des adhésions (spec membership-timeline). */
export interface TimelineItem {
  id: string;
  /** Jour de l'intervention, heure de Paris (AAAA-MM-JJ). */
  day: string;
  title: string;
  outlet: string;
  thumbnailUrl: string | null;
  /** Vidéo de la chaîne officielle de David Lisnard : miniature sur le graphique. */
  official: boolean;
  live: boolean;
}

/**
 * Toutes les interventions publiées et visibles, dans l'ordre chronologique, réduites
 * à ce que le graphique affiche (environ 220 lignes).
 */
export async function listTimelineItems(db: Db): Promise<TimelineItem[]> {
  const rows = await db
    .select({
      id: item.id,
      day: sql<string>`to_char(${sortDate} at time zone 'Europe/Paris', 'YYYY-MM-DD')`,
      title: item.title,
      outlet: summaryColumns.outlet,
      thumbnailUrl: summaryColumns.thumbnailUrl,
      official: source.official,
      liveStatus: item.liveStatus,
    })
    .from(item)
    .innerJoin(source, eq(item.sourceId, source.id))
    .where(
      and(
        eq(item.status, 'published'),
        sql`${item.media} is not null`,
        sql`${item.duplicateOf} is null`,
      ),
    )
    .orderBy(sortDate, item.id);
  return rows.map(({ liveStatus, ...row }) => ({
    ...row,
    // Un direct en cours ou terminé reste signalé comme direct sur le graphique.
    live: liveStatus === 'live' || liveStatus === 'ended',
  }));
}

/** Visible : publiée, dotée d'un rendu et pas reprise d'un autre article. */
const visibleItem = sql`${item.status} = 'published' and ${item.media} is not null and ${item.duplicateOf} is null`;

/** Citation trouvée, avec ce qu'il faut pour l'afficher hors de son intervention. */
export interface QuoteHit extends PublicQuote {
  itemId: string;
  title: string;
  outlet: string;
  /** Vidéo de la chaîne de David Lisnard : le média n'est pas répété après son nom. */
  official: boolean;
  /** Jour de l'intervention, heure de Paris. */
  day: string;
}

const quoteHitColumns = {
  text: quote.text,
  startS: quote.startS,
  theme: quote.theme,
  itemId: item.id,
  title: item.title,
  outlet: summaryColumns.outlet,
  official: source.official,
  day: sql<string>`to_char(${sortDate} at time zone 'Europe/Paris', 'YYYY-MM-DD')`,
};

/** Citation d'une intervention à ce minutage, à 5 secondes près (page d'une citation). */
export async function getQuoteAt(db: Db, itemId: string, startS: number): Promise<QuoteHit | null> {
  if (!UUID.test(itemId)) return null;
  const [row] = await db
    .select(quoteHitColumns)
    .from(quote)
    .innerJoin(item, eq(quote.itemId, item.id))
    .innerJoin(source, eq(item.sourceId, source.id))
    .where(and(eq(item.id, itemId), visibleItem, sql`abs(${quote.startS} - ${startS}) <= 5`))
    .orderBy(sql`abs(${quote.startS} - ${startS})`)
    .limit(1);
  return row ?? null;
}

/**
 * Recherche plein texte en français, sans accents (spec intervention-quotes) : citations
 * d'abord, classées par pertinence, puis interventions par titre et résumé.
 */
export async function search(
  db: Db,
  q: string,
  limit = 20,
): Promise<{ quotes: QuoteHit[]; interventions: InterventionSummary[] }> {
  const query = sql`websearch_to_tsquery('french', lp_normalize(${q}))`;
  const quoteVector = sql`to_tsvector('french', ${quote.search})`;
  // Même expression que l'index item_search_idx (migration 0013).
  const itemVector = sql`to_tsvector('french', lp_normalize(${item.title} || ' ' || coalesce(${item.summary}->>'text', '')))`;
  const [quotes, items] = await Promise.all([
    db
      .select(quoteHitColumns)
      .from(quote)
      .innerJoin(item, eq(quote.itemId, item.id))
      .innerJoin(source, eq(item.sourceId, source.id))
      .where(and(visibleItem, sql`${quoteVector} @@ ${query}`))
      .orderBy(desc(sql`ts_rank(${quoteVector}, ${query})`), desc(sortDate))
      // Marge pour les doublons retirés ci-dessous.
      .limit(limit * 2),
    db
      .select(summaryColumns)
      .from(item)
      .innerJoin(source, eq(item.sourceId, source.id))
      .where(and(visibleItem, sql`${itemVector} @@ ${query}`))
      .orderBy(desc(sql`ts_rank(${itemVector}, ${query})`), desc(sortDate))
      .limit(limit),
  ]);
  const now = new Date();
  // Une même émission publiée deux fois donne la même phrase : on garde la mieux classée.
  const seen = new Set<string>();
  const unique = quotes.filter((hit) => {
    const key = hit.text.toLowerCase().replace(/\W+/gu, ' ').trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return {
    quotes: unique.slice(0, limit),
    interventions: items.map((row) => toSummary(row as SummaryRow, now)),
  };
}

/** Intervention placée sur la carte des déplacements (spec intervention-places). */
export interface PlacedIntervention {
  id: string;
  title: string;
  outlet: string;
  /** Jour de l'intervention, heure de Paris. */
  day: string;
  thumbnailUrl: string | null;
  label: string | null;
  city: string | null;
  lat: number;
  lon: number;
  approximate: boolean;
}

/** Déplacements situés en France : interventions visibles, non reprises, avec coordonnées. */
export async function listPlaces(db: Db): Promise<PlacedIntervention[]> {
  const rows = await db
    .select({
      id: item.id,
      title: item.title,
      outlet: summaryColumns.outlet,
      day: sql<string>`to_char(${sortDate} at time zone 'Europe/Paris', 'YYYY-MM-DD')`,
      thumbnailUrl: summaryColumns.thumbnailUrl,
      place: item.place,
    })
    .from(item)
    .innerJoin(source, eq(item.sourceId, source.id))
    .where(
      and(
        eq(item.status, 'published'),
        sql`${item.media} is not null`,
        sql`${item.duplicateOf} is null`,
        sql`(${item.place}->>'onSite')::boolean`,
        sql`${item.place}->'lat' <> 'null'::jsonb`,
      ),
    )
    .orderBy(desc(sortDate), item.id);
  return rows.flatMap(({ place, ...row }) =>
    place?.lat != null && place.lon != null
      ? [
          {
            ...row,
            label: place.label,
            city: place.city,
            lat: place.lat,
            lon: place.lon,
            approximate: place.approximate,
          },
        ]
      : [],
  );
}

/** Liste paginée par curseur des interventions publiées (spec intervention-feed). */
export async function listPublished(
  db: Db,
  { status, theme, cursor, limit, now = new Date() }: ListOptions,
): Promise<{ items: InterventionSummary[]; nextCursor: string | null }> {
  // À venir : de la plus proche à la plus lointaine ; sinon de la plus récente à la plus ancienne.
  const ascending = status === 'upcoming';
  // Un contenu n'est visible qu'une fois son rendu média calculé (spec intervention-media).
  const conditions: SQL[] = [
    sql`${item.status} = 'published'`,
    sql`${item.media} is not null`,
    // Reprise d'un article déjà listé (spec intervention-collection, « Dédoublonnage »).
    sql`${item.duplicateOf} is null`,
    statusCondition(status, now),
  ];
  if (theme) conditions.push(sql`${item.themes} @> array[${theme}]::text[]`);
  const after = cursor ? decodeCursor(cursor) : null;
  if (after) {
    conditions.push(
      ascending
        ? sql`(${sortDate}, ${item.id}) > (${new Date(after.d)}, ${after.i}::uuid)`
        : sql`(${sortDate}, ${item.id}) < (${new Date(after.d)}, ${after.i}::uuid)`,
    );
  }
  const rows = (await db
    .select(summaryColumns)
    .from(item)
    .innerJoin(source, eq(item.sourceId, source.id))
    .where(and(...conditions))
    .orderBy(
      ascending ? sql`${sortDate} asc, ${item.id} asc` : sql`${sortDate} desc, ${item.id} desc`,
    )
    .limit(limit + 1)) as SummaryRow[];

  const page = rows.slice(0, limit).map((r) => toSummary(r, now));
  const last = page.at(-1);
  return {
    items: page,
    nextCursor: rows.length > limit && last ? encodeCursor({ d: last.date, i: last.id }) : null,
  };
}

/** Détail d'une intervention publiée, ou null si inconnue ou non publiée. */
export async function getPublishedById(
  db: Db,
  id: string,
  now = new Date(),
): Promise<InterventionDetail | null> {
  if (!UUID.test(id)) return null;
  const [row] = await db
    .select({
      ...summaryColumns,
      description: item.description,
      sourceKind: source.kind,
      official: source.official,
      url: item.url,
      media: item.media,
      summary: item.summary,
    })
    .from(item)
    .innerJoin(source, eq(item.sourceId, source.id))
    .where(and(eq(item.id, id), sql`${item.status} = 'published'`, sql`${item.media} is not null`))
    .limit(1);
  if (!row) return null;
  return {
    ...toSummary(row as SummaryRow, now),
    // Description d'une vidéo YouTube : seulement pour la chaîne officielle. Celle d'une
    // chaîne de média parle de toute l'émission (liens, autres invités), pas de lui.
    description: row.sourceKind === 'youtube' && !row.official ? '' : row.description,
    quotes: await db
      .select({ text: quote.text, startS: quote.startS, theme: quote.theme })
      .from(quote)
      .where(eq(quote.itemId, id))
      .orderBy(quote.startS),
    url: row.url,
    media: row.media as MediaRender,
    summary: toPublicSummary(row.summary),
  };
}
