/**
 * Lecture publique (backend, ADR 0017) : uniquement les interventions publiées,
 * sans aucune donnée interne (probabilités, seuils, journal).
 */
import { and, eq, type SQL, sql } from 'drizzle-orm';

import type { Db } from './client';
import { item, type MediaRender, source } from './schema';

export type TemporalStatus = 'live' | 'upcoming' | 'past';
export type PublicRole = 'national' | 'amf';

export interface InterventionSummary {
  id: string;
  title: string;
  outlet: string;
  kind: string | null;
  role: PublicRole;
  status: TemporalStatus;
  /** Début de diffusion, sinon publication (ISO 8601). */
  date: string;
  thumbnailUrl: string | null;
}

export interface InterventionDetail extends InterventionSummary {
  description: string;
  url: string;
  media: MediaRender;
}

export interface ListOptions {
  status: TemporalStatus;
  role?: PublicRole;
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
  role: item.role,
  liveStatus: item.liveStatus,
  startsAt: item.startsAt,
  date: sortDate,
  thumbnailUrl: item.thumbnailUrl,
};

type SummaryRow = {
  id: string;
  title: string;
  outlet: string;
  kind: string | null;
  role: string | null;
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
    role: row.role as PublicRole,
    status: temporalStatus(row, now),
    date: new Date(row.date).toISOString(),
    thumbnailUrl: row.thumbnailUrl,
  };
}

/** Liste paginée par curseur des interventions publiées (spec intervention-feed). */
export async function listPublished(
  db: Db,
  { status, role, cursor, limit, now = new Date() }: ListOptions,
): Promise<{ items: InterventionSummary[]; nextCursor: string | null }> {
  // À venir : de la plus proche à la plus lointaine ; sinon de la plus récente à la plus ancienne.
  const ascending = status === 'upcoming';
  const conditions: SQL[] = [sql`${item.status} = 'published'`, statusCondition(status, now)];
  if (role) conditions.push(eq(item.role, role));
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
    })
    .from(item)
    .innerJoin(source, eq(item.sourceId, source.id))
    .where(and(eq(item.id, id), sql`${item.status} = 'published'`))
    .limit(1);
  if (!row) return null;
  return {
    ...toSummary(row as SummaryRow, now),
    description: row.description,
    url: row.url,
    // Repli si le rendu n'a pas pu être calculé (spec intervention-media).
    media: row.media ?? { kind: 'link', og: {} },
  };
}
