/**
 * Point d'entrée du backoffice (spec admin-backoffice, ADR 0032) : seules écritures
 * permises au service admin, avec son rôle Postgres aux droits limités. Les résumés
 * restent produits par le worker, sur demande.
 */
import { and, count, desc, eq, ilike, isNotNull, isNull, or, type SQL, sql } from 'drizzle-orm';

import type { Db } from './client';
import { adminAction, item, source } from './schema';

export type AdminFilter = 'all' | 'visible' | 'hidden' | 'summary_failed' | 'summary_requested';

/** État du résumé tel que l'affiche le backoffice. */
export type SummaryState = 'requested' | 'ok' | 'failed' | 'not_speaking' | 'pending' | 'none';

export interface AdminItem {
  id: string;
  title: string;
  outlet: string;
  official: boolean;
  url: string;
  thumbnailUrl: string | null;
  /** Jour de l'intervention, heure de Paris. */
  day: string;
  status: 'pending' | 'published' | 'rejected';
  hiddenAt: string | null;
  hiddenReason: string | null;
  summary: SummaryState;
  summaryRequestedAt: string | null;
  /** Le résumé ne concerne que les vidéos YouTube intégrées. */
  summarizable: boolean;
}

const sortDate = sql`coalesce(${item.startsAt}, ${item.publishedAt})`;
const summarizable = sql<boolean>`(${item.media}->>'provider') = 'youtube'`;

const columns = {
  id: item.id,
  title: item.title,
  outlet: sql<string>`coalesce(${item.outlet}, ${source.name})`,
  official: source.official,
  url: item.url,
  thumbnailUrl: item.thumbnailUrl,
  day: sql<string>`to_char(${sortDate} at time zone 'Europe/Paris', 'YYYY-MM-DD')`,
  status: item.status,
  hiddenAt: sql<
    string | null
  >`to_char(${item.hiddenAt} at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`,
  hiddenReason: item.hiddenReason,
  summaryKind: sql<string | null>`${item.summary}->>'kind'`,
  summaryReason: sql<string | null>`${item.summary}->>'reason'`,
  summaryRequestedAt: sql<
    string | null
  >`to_char(${item.summaryRequestedAt} at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`,
  summarizable,
};

type Row = {
  [K in keyof typeof columns]: (typeof columns)[K] extends SQL<infer T> ? T : unknown;
} & {
  status: AdminItem['status'];
  title: string;
  id: string;
  url: string;
  thumbnailUrl: string | null;
  hiddenReason: string | null;
  official: boolean;
};

function summaryState(row: Row): SummaryState {
  if (row.summaryRequestedAt) return 'requested';
  if (row.summaryKind === 'ok') return 'ok';
  if (row.summaryKind === 'none' && row.summaryReason === 'not_speaking') return 'not_speaking';
  if (row.summaryKind === 'none') return 'failed';
  return row.summarizable ? 'pending' : 'none';
}

function toAdminItem(row: Row): AdminItem {
  const { summaryKind: _kind, summaryReason: _reason, ...rest } = row;
  return { ...rest, summary: summaryState(row) };
}

const FILTERS: Record<AdminFilter, SQL | undefined> = {
  all: undefined,
  visible: and(eq(item.status, 'published'), isNull(item.hiddenAt)),
  hidden: isNotNull(item.hiddenAt),
  summary_failed: sql`${item.summary}->>'kind' = 'none' and ${item.summary}->>'reason' <> 'not_speaking'`,
  summary_requested: isNotNull(item.summaryRequestedAt),
};

/** Interventions publiées (ou masquées), des plus récentes aux plus anciennes. */
export async function listAdminItems(
  db: Db,
  options: { filter?: AdminFilter; search?: string; offset?: number; limit?: number } = {},
): Promise<{ items: AdminItem[]; total: number }> {
  const where = and(
    // Le backoffice modère ce que le site a publié (ou masqué) ; le reste est hors champ.
    or(eq(item.status, 'published'), isNotNull(item.hiddenAt)),
    FILTERS[options.filter ?? 'all'],
    options.search
      ? ilike(item.title, `%${options.search.replace(/[%_\\]/g, '\\$&')}%`)
      : undefined,
  );
  const [rows, [totalRow]] = await Promise.all([
    db
      .select(columns)
      .from(item)
      .innerJoin(source, eq(item.sourceId, source.id))
      .where(where)
      .orderBy(desc(sortDate), item.id)
      .offset(options.offset ?? 0)
      .limit(Math.min(options.limit ?? 25, 100)),
    db.select({ total: count() }).from(item).where(where),
  ]);
  return { items: (rows as Row[]).map(toAdminItem), total: totalRow?.total ?? 0 };
}

export async function getAdminItem(db: Db, id: string): Promise<AdminItem | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const [row] = await db
    .select(columns)
    .from(item)
    .innerJoin(source, eq(item.sourceId, source.id))
    .where(eq(item.id, id))
    .limit(1);
  return row ? toAdminItem(row as Row) : null;
}

/** Masque une intervention (invisible partout) et l'inscrit au journal. */
export async function hideItem(db: Db, id: string, reason: string | null): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .update(item)
      .set({ hiddenAt: sql`now()`, hiddenReason: reason })
      .where(and(eq(item.id, id), isNull(item.hiddenAt)))
      .returning({ id: item.id });
    if (!row) return false;
    await tx.insert(adminAction).values({ kind: 'hide', itemId: id, reason });
    return true;
  });
}

export async function unhideItem(db: Db, id: string): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .update(item)
      .set({ hiddenAt: null, hiddenReason: null })
      .where(and(eq(item.id, id), isNotNull(item.hiddenAt)))
      .returning({ id: item.id });
    if (!row) return false;
    await tx.insert(adminAction).values({ kind: 'unhide', itemId: id });
    return true;
  });
}

/**
 * Demande un nouveau résumé (vidéo YouTube intégrée seulement) : le worker le fait en
 * priorité au cycle suivant, tentatives remises à zéro.
 */
export async function requestSummary(db: Db, id: string): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .update(item)
      .set({ summaryRequestedAt: sql`now()`, summaryAttempts: 0, summaryRetryAt: null })
      .where(and(eq(item.id, id), summarizable))
      .returning({ id: item.id });
    if (!row) return false;
    await tx.insert(adminAction).values({ kind: 'request_summary', itemId: id });
    return true;
  });
}

export interface AdminActionEntry {
  id: string;
  at: string;
  kind: 'hide' | 'unhide' | 'request_summary';
  itemId: string;
  title: string;
  reason: string | null;
}

/** Journal des actions, du plus récent au plus ancien. */
export async function listAdminActions(
  db: Db,
  options: { offset?: number; limit?: number } = {},
): Promise<{ actions: AdminActionEntry[]; total: number }> {
  const [actions, [totalRow]] = await Promise.all([
    db
      .select({
        id: adminAction.id,
        at: sql<string>`to_char(${adminAction.at} at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`,
        kind: adminAction.kind,
        itemId: adminAction.itemId,
        title: item.title,
        reason: adminAction.reason,
      })
      .from(adminAction)
      .innerJoin(item, eq(adminAction.itemId, item.id))
      .orderBy(desc(adminAction.at))
      .offset(options.offset ?? 0)
      .limit(Math.min(options.limit ?? 25, 100)),
    db.select({ total: count() }).from(adminAction),
  ]);
  return { actions, total: totalRow?.total ?? 0 };
}
