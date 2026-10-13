/**
 * Écriture (worker uniquement, ADR 0017). Un import de ce module dans packages/api
 * est une erreur de revue.
 */
import { and, desc, eq, inArray, or, sql } from 'drizzle-orm';

import type { Db } from './client';
import {
  type AppliedThresholds,
  type ClassifierAnswers,
  classification,
  item,
  type MediaRender,
  type SummaryRecord,
  source,
  type Theme,
} from './schema';

export interface SourceRecord {
  id: string;
  kind: 'youtube' | 'rss';
  name: string;
  active: boolean;
}

/** Recopie les sources de la configuration du worker (idempotent). */
export async function upsertSources(db: Db, sources: SourceRecord[]): Promise<void> {
  if (sources.length === 0) return;
  await db
    .insert(source)
    .values(sources)
    .onConflictDoUpdate({
      target: source.id,
      set: { kind: sql`excluded.kind`, name: sql`excluded.name`, active: sql`excluded.active` },
    });
}

export interface CandidateInput {
  sourceId: string;
  platformId: string;
  url: string;
  outlet?: string | null;
  title: string;
  description: string;
  publishedAt: Date;
  startsAt?: Date | null;
  endsAt?: Date | null;
  liveStatus?: 'none' | 'upcoming' | 'live' | 'ended';
  thumbnailUrl?: string | null;
  durationS?: number | null;
}

/**
 * Enregistre un contenu candidat ou met à jour ses métadonnées s'il est déjà connu
 * (dédoublonnage par platformId, spec intervention-collection). La première source
 * et la date de publication d'origine sont conservées.
 */
export async function upsertItem(
  db: Db,
  input: CandidateInput,
): Promise<{ id: string; inserted: boolean }> {
  const [row] = await db
    .insert(item)
    .values({
      ...input,
      startsAt: input.startsAt ?? null,
      endsAt: input.endsAt ?? null,
      liveStatus: input.liveStatus ?? 'none',
      thumbnailUrl: input.thumbnailUrl ?? null,
      outlet: input.outlet ?? null,
      durationS: input.durationS ?? null,
    })
    .onConflictDoUpdate({
      target: item.platformId,
      set: {
        url: sql`excluded.url`,
        outlet: sql`coalesce(excluded.outlet, ${item.outlet})`,
        title: sql`excluded.title`,
        description: sql`excluded.description`,
        startsAt: sql`coalesce(excluded.starts_at, ${item.startsAt})`,
        endsAt: sql`coalesce(excluded.ends_at, ${item.endsAt})`,
        liveStatus: sql`excluded.live_status`,
        thumbnailUrl: sql`coalesce(excluded.thumbnail_url, ${item.thumbnailUrl})`,
        durationS: sql`coalesce(excluded.duration_s, ${item.durationS})`,
        updatedAt: sql`now()`,
      },
    })
    .returning({ id: item.id, inserted: sql<boolean>`(xmax = 0)` });
  if (!row) throw new Error(`Échec de l'enregistrement de ${input.platformId}`);
  return { id: row.id, inserted: row.inserted };
}

/** Met à jour le statut de diffusion d'un contenu connu (revérification des directs). */
export async function updateLiveStatus(
  db: Db,
  platformId: string,
  update: {
    liveStatus: 'none' | 'upcoming' | 'live' | 'ended';
    startsAt?: Date | null;
    endsAt?: Date | null;
  },
): Promise<void> {
  await db
    .update(item)
    .set({
      liveStatus: update.liveStatus,
      ...(update.startsAt !== undefined && { startsAt: update.startsAt }),
      ...(update.endsAt !== undefined && { endsAt: update.endsAt }),
      updatedAt: sql`now()`,
    })
    .where(eq(item.platformId, platformId));
}

/** Contenus dont le direct est programmé ou en cours, à revérifier à chaque cycle. */
export async function listLiveToRecheck(
  db: Db,
): Promise<{ platformId: string; liveStatus: 'upcoming' | 'live' }[]> {
  return db
    .select({
      platformId: item.platformId,
      liveStatus: sql<'upcoming' | 'live'>`${item.liveStatus}`,
    })
    .from(item)
    .where(inArray(item.liveStatus, ['upcoming', 'live']));
}

export interface ClassificationTarget {
  id: string;
  sourceId: string;
  sourceKind: 'youtube' | 'rss';
  outlet: string;
  url: string;
  title: string;
  description: string;
  publishedAt: Date;
  startsAt: Date | null;
  /** Empreinte de l'entrée envoyée au classifieur, calculée en SQL (design D4). */
  inputHash: string;
}

/**
 * Empreinte des champs envoyés au classifieur et de la version des questions.
 * Un contenu ne redevient une cible que si elle change (cache, design D4).
 * L'heure de début n'en fait pas partie : elle change quand un direct programmé
 * démarre, et Jev n'étant pas strictement déterministe, un nouveau classement pourrait
 * dépublier le direct au moment même où il commence.
 */
export function inputHashSql(questionsVersion: number) {
  return sql<string>`md5(concat_ws('|', ${questionsVersion}::text, ${item.title}, ${item.description},
    coalesce(${item.outlet}, ${source.name}), ${source.kind}::text, ${item.publishedAt}::text))`;
}

/**
 * Contenus à (re)classer : en attente, ou modifiés depuis leur dernière classification.
 * Le worker compare ensuite le hash d'entrée pour éviter un appel inutile (design D4).
 */
export async function listClassificationTargets(
  db: Db,
  limit: number,
  questionsVersion: number,
): Promise<ClassificationTarget[]> {
  // Dernière empreinte par sous-requête corrélée (index classification_item_created_idx) :
  // pas d'agrégation de tout le journal à chaque cycle.
  const lastHash = sql<string | null>`(select c.input_hash from ${classification} c
    where c.item_id = ${item.id} order by c.created_at desc limit 1)`;
  const hash = inputHashSql(questionsVersion);
  return (
    db
      .select({
        id: item.id,
        sourceId: item.sourceId,
        sourceKind: source.kind,
        outlet: sql<string>`coalesce(${item.outlet}, ${source.name})`,
        url: item.url,
        title: item.title,
        description: item.description,
        publishedAt: item.publishedAt,
        startsAt: item.startsAt,
        inputHash: hash,
      })
      .from(item)
      .innerJoin(source, eq(item.sourceId, source.id))
      .where(or(eq(item.status, 'pending'), sql`${lastHash} is distinct from ${hash}`))
      // Les plus récents d'abord : un direct qui vient d'arriver n'attend pas derrière des
      // contenus anciens dont le classement échoue à chaque cycle.
      .orderBy(desc(item.firstSeenAt))
      .limit(limit)
  );
}

export interface ClassificationRecord {
  itemId: string;
  model: string;
  questionsVersion: number;
  inputHash: string;
  answers: ClassifierAnswers;
  /** null : aucun seuil défini pour le modèle, publication bloquée (spec). */
  thresholds: AppliedThresholds | null;
  outcome: 'published' | 'rejected';
  role: 'national' | 'amf' | 'mairie' | 'hors_sujet';
  kind: 'tv' | 'radio' | 'presse' | 'podcast' | 'meeting' | 'discours' | 'stream' | 'reseau_social';
  themes: Theme[];
}

/**
 * Ajoute une décision au journal et dénormalise statut, rôle et type sur le contenu,
 * dans une même transaction (ADR 0005, ADR 0017).
 */
export async function recordClassification(db: Db, r: ClassificationRecord): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.insert(classification).values({
      itemId: r.itemId,
      model: r.model,
      questionsVersion: r.questionsVersion,
      inputHash: r.inputHash,
      answers: r.answers,
      thresholds: r.thresholds,
      outcome: r.outcome,
    });
    await tx
      .update(item)
      .set({ status: r.outcome, role: r.role, kind: r.kind, themes: r.themes })
      .where(eq(item.id, r.itemId));
  });
}

/** Dernière décision de chaque contenu classé (recalcul des seuils, design D4). */
export async function listLatestClassifications(db: Db) {
  return db
    .selectDistinctOn([classification.itemId], {
      itemId: classification.itemId,
      sourceId: item.sourceId,
      model: classification.model,
      questionsVersion: classification.questionsVersion,
      inputHash: classification.inputHash,
      answers: classification.answers,
      outcome: classification.outcome,
      themes: item.themes,
    })
    .from(classification)
    .innerJoin(item, eq(item.id, classification.itemId))
    .orderBy(classification.itemId, desc(classification.createdAt));
}

/** Enregistre le rendu média d'un contenu (spec intervention-media). */
export async function setMedia(db: Db, itemId: string, media: MediaRender): Promise<void> {
  await db.update(item).set({ media }).where(eq(item.id, itemId));
}

/** Contenus publiés sans rendu média calculé. */
export async function listPublishedWithoutMedia(db: Db, limit: number) {
  return db
    .select({
      id: item.id,
      url: item.url,
      title: item.title,
      outlet: sql<string>`coalesce(${item.outlet}, ${source.name})`,
    })
    .from(item)
    .innerJoin(source, eq(item.sourceId, source.id))
    .where(and(eq(item.status, 'published'), sql`${item.media} is null`))
    .limit(limit);
}

/** Contenus publiés (d'une source, ou tous) dont on recalcule le rendu à la demande. */
export async function listPublishedForMediaRefresh(db: Db, sourceId?: string) {
  return db
    .select({
      id: item.id,
      url: item.url,
      title: item.title,
      outlet: sql<string>`coalesce(${item.outlet}, ${source.name})`,
    })
    .from(item)
    .innerJoin(source, eq(item.sourceId, source.id))
    .where(and(eq(item.status, 'published'), sourceId ? eq(item.sourceId, sourceId) : undefined));
}

export interface SummaryTarget {
  id: string;
  url: string;
  title: string;
  outlet: string;
  durationS: number | null;
}

/**
 * Vidéos YouTube publiées à résumer (spec intervention-summaries, design D2) : diffusion
 * terminée, sans résumé ou avec un résumé d'une autre version de la consigne. Les plus
 * récentes d'abord.
 */
export async function listSummaryTargets(
  db: Db,
  limit: number,
  promptVersion: number,
): Promise<SummaryTarget[]> {
  return db
    .select({
      id: item.id,
      url: item.url,
      title: item.title,
      outlet: sql<string>`coalesce(${item.outlet}, ${source.name})`,
      durationS: item.durationS,
    })
    .from(item)
    .innerJoin(source, eq(item.sourceId, source.id))
    .where(
      and(
        eq(item.status, 'published'),
        sql`${item.media}->>'provider' = 'youtube'`,
        inArray(item.liveStatus, ['none', 'ended']),
        sql`(${item.summary} is null or (${item.summary}->>'promptVersion')::int <> ${promptVersion})`,
      ),
    )
    .orderBy(desc(sql`coalesce(${item.startsAt}, ${item.publishedAt})`))
    .limit(limit);
}

/** Enregistre un résumé (ou son absence motivée) et remet le compteur d'échecs à zéro. */
export async function recordSummary(db: Db, itemId: string, summary: SummaryRecord) {
  await db.update(item).set({ summary, summaryAttempts: 0 }).where(eq(item.id, itemId));
}

/**
 * Compte un échec. Au plafond, enregistre l'abandon pour la version courante de la
 * consigne (design D5) : une nouvelle version relancera la production.
 */
export async function recordSummaryFailure(
  db: Db,
  itemId: string,
  maxAttempts: number,
  abandoned: SummaryRecord,
): Promise<{ abandoned: boolean }> {
  const [row] = await db
    .update(item)
    .set({ summaryAttempts: sql`${item.summaryAttempts} + 1` })
    .where(eq(item.id, itemId))
    .returning({ attempts: item.summaryAttempts });
  if ((row?.attempts ?? 0) < maxAttempts) return { abandoned: false };
  await recordSummary(db, itemId, abandoned);
  return { abandoned: true };
}

/** Dépense en résumés depuis une date (plafond quotidien, design D4). */
export async function summaryCostSince(db: Db, since: Date): Promise<number> {
  const [row] = await db
    .select({
      total: sql<number>`coalesce(sum((${item.summary}->>'cost')::float8), 0)::float8`,
    })
    .from(item)
    .where(sql`(${item.summary}->>'generatedAt')::timestamptz >= ${since}`);
  return Number(row?.total ?? 0);
}

/** Relance les résumés abandonnés après des échecs (commande summarize --retry). */
export async function resetFailedSummaries(db: Db): Promise<number> {
  const rows = await db
    .update(item)
    .set({ summary: null, summaryAttempts: 0 })
    .where(sql`${item.summary}->>'reason' = 'failed'`)
    .returning({ id: item.id });
  return rows.length;
}
