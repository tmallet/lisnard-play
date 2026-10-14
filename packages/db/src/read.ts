/**
 * Lecture publique (backend, ADR 0017) : uniquement les interventions publiées,
 * sans aucune donnée interne (probabilités, seuils, journal).
 */
import { and, eq, type SQL, sql } from 'drizzle-orm';

import type { Db } from './client';
import { item, type MediaRender, type SummaryRecord, source, THEMES, type Theme } from './schema';

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

export interface InterventionDetail extends InterventionSummary {
  description: string;
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
    themes: row.themes.filter((t): t is Theme => (THEMES as readonly string[]).includes(t)),
    status: temporalStatus(row, now),
    date: new Date(row.date).toISOString(),
    thumbnailUrl: row.thumbnailUrl,
  };
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
    description: row.description,
    url: row.url,
    media: row.media as MediaRender,
    summary: toPublicSummary(row.summary),
  };
}
