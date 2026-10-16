/**
 * Écriture (worker uniquement, ADR 0017). Un import de ce module dans packages/api
 * est une erreur de revue.
 */
import { and, between, desc, eq, inArray, or, type SQL, sql } from 'drizzle-orm';

import type { Db } from './client';
import {
  type AppliedThresholds,
  type ClassifierAnswers,
  classification,
  item,
  type MediaRender,
  type NotificationKind,
  notificationSent,
  type PlaceRecord,
  pushSubscription,
  quote,
  type SummaryRecord,
  source,
  summarySpend,
  type Theme,
} from './schema';

export interface SourceRecord {
  id: string;
  kind: 'youtube' | 'rss';
  name: string;
  active: boolean;
  official?: boolean;
}

/** Recopie les sources de la configuration du worker (idempotent). */
export async function upsertSources(db: Db, sources: SourceRecord[]): Promise<void> {
  if (sources.length === 0) return;
  await db
    .insert(source)
    .values(sources.map((s) => ({ ...s, official: s.official ?? false })))
    .onConflictDoUpdate({
      target: source.id,
      set: {
        kind: sql`excluded.kind`,
        name: sql`excluded.name`,
        active: sql`excluded.active`,
        official: sql`excluded.official`,
      },
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

/**
 * Clôt une vidéo que la plateforme a retirée (spec « Statut de diffusion ») : un direct
 * passe à `ended`, un direct programmé redevient `none`, les autres restent inchangées.
 */
export async function closeVanished(db: Db, platformId: string): Promise<void> {
  await db
    .update(item)
    .set({
      liveStatus: sql`case when ${item.liveStatus} = 'live' then 'ended'::live_status else 'none'::live_status end`,
      endsAt: sql`case when ${item.liveStatus} = 'live' then now() else ${item.endsAt} end`,
      updatedAt: sql`now()`,
    })
    .where(and(eq(item.platformId, platformId), inArray(item.liveStatus, ['upcoming', 'live'])));
}

/**
 * Directs programmés imminents (spec intervention-collection) : début prévu dans les
 * 15 prochaines minutes, ou passé depuis moins de 30 minutes sans démarrage constaté.
 */
export async function listLiveSoon(
  db: Db,
  now: Date = new Date(),
): Promise<{ platformId: string; liveStatus: 'upcoming' | 'live' }[]> {
  return db
    .select({
      platformId: item.platformId,
      liveStatus: sql<'upcoming' | 'live'>`${item.liveStatus}`,
    })
    .from(item)
    .where(
      and(
        eq(item.liveStatus, 'upcoming'),
        between(
          item.startsAt,
          new Date(now.getTime() - 30 * 60_000),
          new Date(now.getTime() + 15 * 60_000),
        ),
      ),
    )
    .limit(50);
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
  /** Restreint au contenu donné (voie rapide d'une notification, ADR 0023). */
  onlyId?: string,
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
      .where(
        and(
          onlyId ? eq(item.id, onlyId) : undefined,
          // Une reprise d'article n'est ni classée ni affichée.
          sql`${item.duplicateOf} is null`,
          or(eq(item.status, 'pending'), sql`${lastHash} is distinct from ${hash}`),
        ),
      )
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
export async function listPublishedWithoutMedia(db: Db, limit: number, onlyId?: string) {
  return db
    .select({
      id: item.id,
      url: item.url,
      title: item.title,
      outlet: sql<string>`coalesce(${item.outlet}, ${source.name})`,
    })
    .from(item)
    .innerJoin(source, eq(item.sourceId, source.id))
    .where(
      and(
        onlyId ? eq(item.id, onlyId) : undefined,
        eq(item.status, 'published'),
        sql`${item.media} is null`,
        sql`${item.duplicateOf} is null`,
      ),
    )
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
      media: item.media,
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
  /** Échecs déjà comptés : fixe l'attente avant l'essai suivant. */
  summaryAttempts: number;
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
      summaryAttempts: item.summaryAttempts,
    })
    .from(item)
    .innerJoin(source, eq(item.sourceId, source.id))
    .where(
      and(
        eq(item.status, 'published'),
        sql`${item.media}->>'provider' = 'youtube'`,
        inArray(item.liveStatus, ['none', 'ended']),
        sql`(${item.summary} is null or (${item.summary}->>'promptVersion')::int <> ${promptVersion})`,
        sql`(${item.summaryRetryAt} is null or ${item.summaryRetryAt} <= now())`,
      ),
    )
    .orderBy(desc(sql`coalesce(${item.startsAt}, ${item.publishedAt})`))
    .limit(limit);
}

export interface QuoteInput {
  text: string;
  startS: number;
  theme: string | null;
}

/**
 * Enregistre un résumé (ou son absence motivée) et remet le compteur d'échecs à zéro.
 * Remplace aussi les citations de l'intervention, dans une même
 * transaction (spec intervention-quotes) : un résumé sans citation les efface.
 */
export async function recordSummary(
  db: Db,
  itemId: string,
  summary: SummaryRecord,
  quotes: QuoteInput[] = [],
) {
  await db.transaction(async (tx) => {
    await tx
      .update(item)
      .set({ summary, summaryAttempts: 0, summaryRetryAt: null })
      .where(eq(item.id, itemId));
    await tx.delete(quote).where(eq(quote.itemId, itemId));
    // Minutage unique par intervention : une citation au même instant est ignorée.
    const unique = quotes.filter((q, i) => quotes.findIndex((o) => o.startS === q.startS) === i);
    if (unique.length > 0)
      await tx.insert(quote).values(
        unique.map((q, position) => ({
          itemId,
          position,
          text: q.text,
          search: sql`lp_normalize(${q.text})`,
          startS: q.startS,
          theme: q.theme,
        })),
      );
  });
}

/**
 * Compte un échec et reporte le prochain essai (`retryAfterMs`). Au plafond, enregistre
 * l'abandon pour la version courante de la consigne (design D5) : une nouvelle version
 * relancera la production.
 */
export async function recordSummaryFailure(
  db: Db,
  itemId: string,
  maxAttempts: number,
  abandoned: SummaryRecord,
  retryAfterMs = 0,
): Promise<{ abandoned: boolean }> {
  const [row] = await db
    .update(item)
    .set({
      summaryAttempts: sql`${item.summaryAttempts} + 1`,
      summaryRetryAt: sql`now() + ${`${retryAfterMs} milliseconds`}::interval`,
    })
    .where(eq(item.id, itemId))
    .returning({ attempts: item.summaryAttempts });
  if ((row?.attempts ?? 0) < maxAttempts) return { abandoned: false };
  await recordSummary(db, itemId, abandoned);
  return { abandoned: true };
}

/** Ajoute le coût d'un appel à la dépense du jour (« AAAA-MM-JJ », heure de Paris). */
export async function addSummarySpend(db: Db, day: string, cost: number): Promise<void> {
  if (cost <= 0) return;
  await db
    .insert(summarySpend)
    .values({ day, cost })
    .onConflictDoUpdate({
      target: summarySpend.day,
      set: { cost: sql`${summarySpend.cost} + excluded.cost` },
    });
}

/** Dépense en résumés d'un jour (plafond quotidien, design D4). */
export async function summarySpentOn(db: Db, day: string): Promise<number> {
  const [row] = await db
    .select({ cost: summarySpend.cost })
    .from(summarySpend)
    .where(eq(summarySpend.day, day));
  return row?.cost ?? 0;
}

/** Relance les résumés abandonnés après des échecs (commande summarize --retry). */
export async function resetFailedSummaries(db: Db): Promise<number> {
  const rows = await db
    .update(item)
    .set({ summary: null, summaryAttempts: 0, summaryRetryAt: null })
    .where(sql`${item.summary}->>'reason' = 'failed'`)
    .returning({ id: item.id });
  return rows.length;
}

// --- Notifications (spec push-notifications, ADR 0024) ---

/** Fenêtre au-delà de laquelle un événement n'est plus notifié (rattrapage, reprise). */
const NOTIFY_WINDOW = sql`interval '2 hours'`;

export interface NotificationEvent {
  itemId: string;
  kind: NotificationKind;
  title: string;
  outlet: string;
  /** Chaîne officielle de David Lisnard. */
  official: boolean;
  sourceKind: 'youtube' | 'rss';
  /** Type d'intervention (`presse`, `tv`…), pour « dans » ou « sur » le média. */
  interventionKind: string | null;
  startsAt: Date | null;
  durationS: number | null;
  thumbnailUrl: string | null;
  /** Texte du résumé, s'il existe (spec intervention-summaries). */
  summaryText: string | null;
}

/** Colonnes d'un événement à notifier (contenu du message, design D1). */
const eventColumns = (kind: NotificationKind) => ({
  itemId: item.id,
  kind: sql<NotificationKind>`${kind}::notification_kind`,
  title: item.title,
  outlet: sql<string>`coalesce(${item.outlet}, ${source.name})`,
  official: source.official,
  sourceKind: source.kind,
  interventionKind: item.kind,
  startsAt: item.startsAt,
  durationS: item.durationS,
  thumbnailUrl: sql<string | null>`coalesce(${item.thumbnailUrl}, ${item.media}->'og'->>'image')`,
  summaryText: sql<
    string | null
  >`case when ${item.summary}->>'kind' = 'ok' then ${item.summary}->>'text' end`,
});

/**
 * Dernière intervention visible, mise en forme comme une nouvelle intervention : sert à
 * la notification de test, pour vérifier le rendu réel sur un appareil.
 */
export async function latestNotificationSample(db: Db): Promise<NotificationEvent | null> {
  const [row] = await db
    .select(eventColumns('new_item'))
    .from(item)
    .innerJoin(source, eq(item.sourceId, source.id))
    .where(
      and(
        eq(item.status, 'published'),
        sql`${item.media} is not null and ${item.duplicateOf} is null`,
      ),
    )
    .orderBy(desc(item.firstSeenAt))
    .limit(1);
  return row ?? null;
}

/** Délai maximal d'attente du résumé avant de notifier une nouvelle vidéo. */
const SUMMARY_WAIT = sql`interval '10 minutes'`;

/**
 * Événements à notifier qui ne l'ont pas encore été (design D5) : passage en direct,
 * direct dans les 15 minutes, nouvelle intervention visible. Une nouvelle intervention
 * déjà annoncée comme direct ou rappel n'est pas notifiée une seconde fois.
 */
export async function listNotificationEvents(db: Db): Promise<NotificationEvent[]> {
  const notSent = (kind: NotificationKind) =>
    sql`not exists (select 1 from ${notificationSent} n where n.item_id = ${item.id} and n.kind = ${kind})`;
  const event = (kind: NotificationKind, where: SQL) =>
    db
      .select(eventColumns(kind))
      .from(item)
      .innerJoin(source, eq(item.sourceId, source.id))
      .where(and(eq(item.status, 'published'), where, notSent(kind)));
  const visible = sql`(${item.media} is not null and ${item.duplicateOf} is null)`;
  const [live, reminder, newItem] = await Promise.all([
    event(
      'live',
      and(
        visible,
        eq(item.liveStatus, 'live'),
        sql`coalesce(${item.startsAt}, ${item.firstSeenAt}) > now() - ${NOTIFY_WINDOW}`,
      ) as SQL,
    ),
    event(
      'reminder',
      and(
        // Rendu exigé : la notification ouvre la page de l'intervention, introuvable sans lui.
        visible,
        eq(item.liveStatus, 'upcoming'),
        sql`${item.startsAt} between now() and now() + interval '15 minutes'`,
      ) as SQL,
    ),
    event(
      'new_item',
      and(
        visible,
        inArray(item.liveStatus, ['none', 'ended']),
        sql`${item.firstSeenAt} > now() - ${NOTIFY_WINDOW}`,
        sql`not exists (select 1 from ${notificationSent} n where n.item_id = ${item.id} and n.kind in ('live', 'reminder'))`,
        // Une vidéo attend son résumé (ou son absence constatée), 10 minutes au plus ;
        // un article de presse n'a pas de résumé (ADR 0021) et part aussitôt.
        sql`(${source.kind} <> 'youtube' or ${item.summary} is not null or ${item.firstSeenAt} <= now() - ${SUMMARY_WAIT})`,
      ) as SQL,
    ),
  ]);
  return [...live, ...reminder, ...newItem];
}

/**
 * Réserve l'envoi d'un événement : true si c'est la première fois. Réserver avant
 * d'envoyer fait perdre une notification en cas de panne plutôt que la doubler.
 */
export async function claimNotification(
  db: Db,
  itemId: string,
  kind: NotificationKind,
): Promise<boolean> {
  const rows = await db
    .insert(notificationSent)
    .values({ itemId, kind })
    .onConflictDoNothing()
    .returning({ itemId: notificationSent.itemId });
  return rows.length > 0;
}

export async function setNotificationRecipients(
  db: Db,
  itemId: string,
  kind: NotificationKind,
  recipients: number,
): Promise<void> {
  await db
    .update(notificationSent)
    .set({ recipients })
    .where(and(eq(notificationSent.itemId, itemId), eq(notificationSent.kind, kind)));
}

const PREFERENCE_COLUMN = {
  live: pushSubscription.live,
  reminder: pushSubscription.reminder,
  new_item: pushSubscription.newItem,
} as const;

/** Abonnements qui ont choisi ce type de notification ; tous sans type (envoi de test). */
export async function listSubscribers(db: Db, kind?: NotificationKind) {
  return db
    .select({
      id: pushSubscription.id,
      kind: pushSubscription.kind,
      endpoint: pushSubscription.endpoint,
      keys: pushSubscription.keys,
    })
    .from(pushSubscription)
    .where(kind ? eq(PREFERENCE_COLUMN[kind], true) : undefined);
}

/** Supprime les abonnements que le service push déclare expirés ou invalides. */
export async function deleteSubscriptionsById(db: Db, ids: string[]): Promise<void> {
  if (ids.length > 0) await db.delete(pushSubscription).where(inArray(pushSubscription.id, ids));
}

/** Purge des abonnements sans confirmation depuis 13 mois (spec push-notifications). */
export async function purgeStaleSubscriptions(db: Db): Promise<number> {
  const rows = await db
    .delete(pushSubscription)
    .where(sql`${pushSubscription.confirmedAt} < now() - interval '13 months'`)
    .returning({ id: pushSubscription.id });
  return rows.length;
}

// --- Reprises d'articles (spec intervention-collection, « Dédoublonnage ») ---

/**
 * Articles de presse, pour repérer les reprises d'une même dépêche par plusieurs médias.
 * `since` restreint aux articles publiés depuis cette date (cycle courant).
 */
export async function listPressItems(db: Db, since?: Date) {
  return db
    .select({
      id: item.id,
      title: item.title,
      publishedAt: item.publishedAt,
      firstSeenAt: item.firstSeenAt,
      visible: sql<boolean>`(${item.status} = 'published' and ${item.media} is not null)`,
      duplicateOf: item.duplicateOf,
    })
    .from(item)
    .innerJoin(source, eq(item.sourceId, source.id))
    .where(and(eq(source.kind, 'rss'), since ? sql`${item.publishedAt} >= ${since}` : undefined))
    .orderBy(item.firstSeenAt, item.id);
}

/** Contenus dont le titre ou la description contient encore une entité HTML. */
export async function listItemsWithEntities(db: Db) {
  const entity = '&(#x[0-9a-f]+|#[0-9]+|[a-z][a-z0-9]*);';
  return db
    .select({ id: item.id, title: item.title, description: item.description })
    .from(item)
    .where(or(sql`${item.title} ~* ${entity}`, sql`${item.description} ~* ${entity}`));
}

export async function setItemText(
  db: Db,
  id: string,
  text: { title: string; description: string },
) {
  await db
    .update(item)
    .set({ ...text, updatedAt: sql`now()` })
    .where(eq(item.id, id));
}

export async function setDuplicateOf(db: Db, id: string, canonicalId: string | null) {
  await db
    .update(item)
    .set({ duplicateOf: canonicalId, updatedAt: sql`now()` })
    .where(eq(item.id, id));
}

// --- Lieux des déplacements (spec intervention-places, ADR 0027) ---

/** Interventions visibles dont le lieu reste à déterminer pour cette version de consigne. */
export async function listPlaceTargets(db: Db, promptVersion: number, limit: number) {
  return (
    db
      .select({
        id: item.id,
        title: item.title,
        description: item.description,
        outlet: sql<string>`coalesce(${item.outlet}, ${source.name})`,
        sourceKind: source.kind,
        kind: item.kind,
        attempts: item.placeAttempts,
      })
      .from(item)
      .innerJoin(source, eq(item.sourceId, source.id))
      .where(
        and(
          eq(item.status, 'published'),
          sql`${item.media} is not null`,
          sql`${item.duplicateOf} is null`,
          sql`(${item.place} is null or (${item.place}->>'promptVersion')::int <> ${promptVersion})`,
          sql`(${item.placeRetryAt} is null or ${item.placeRetryAt} <= now())`,
        ),
      )
      // Les contenus jamais essayés d'abord : quelques échecs répétés ne bloquent pas
      // l'historique.
      .orderBy(item.placeAttempts, desc(item.firstSeenAt))
      .limit(limit)
  );
}

/** Lieu déterminé (ou abandonné) : remet à zéro le compteur d'échecs. */
export async function recordPlace(db: Db, itemId: string, place: PlaceRecord): Promise<void> {
  await db
    .update(item)
    .set({ place, placeAttempts: 0, placeRetryAt: null, updatedAt: sql`now()` })
    .where(eq(item.id, itemId));
}

/** Échec passager : nouvel essai après `retryAfterMs`. Renvoie le nombre d'échecs. */
export async function recordPlaceFailure(
  db: Db,
  itemId: string,
  retryAfterMs: number,
): Promise<number> {
  const [row] = await db
    .update(item)
    .set({
      placeAttempts: sql`${item.placeAttempts} + 1`,
      placeRetryAt: sql`now() + make_interval(secs => ${retryAfterMs / 1000})`,
    })
    .where(eq(item.id, itemId))
    .returning({ attempts: item.placeAttempts });
  return row?.attempts ?? 0;
}

/** Lieux répondus par le modèle mais pas encore géolocalisés. */
export async function listPendingGeocodes(db: Db, limit: number) {
  return db
    .select({ id: item.id, place: item.place })
    .from(item)
    .where(sql`(${item.place}->>'geocodePending')::boolean`)
    .limit(limit);
}

/** Citation à noter (ADR 0031) : son texte et le titre de son intervention, pour le contexte. */
export interface QuoteToScore {
  id: string;
  text: string;
  title: string;
}

/**
 * Citations sans note pour la version courante de la question, des interventions
 * visibles d'abord les plus récentes : les récapitulatifs du jour sont servis en premier.
 */
export async function listQuotesToScore(
  db: Db,
  version: number,
  limit: number,
): Promise<QuoteToScore[]> {
  return db
    .select({ id: quote.id, text: quote.text, title: item.title })
    .from(quote)
    .innerJoin(item, eq(quote.itemId, item.id))
    .where(
      and(
        sql`${quote.strikingVersion} is distinct from ${version}`,
        eq(item.status, 'published'),
        sql`${item.media} is not null`,
      ),
    )
    .orderBy(desc(sql`coalesce(${item.startsAt}, ${item.publishedAt})`), quote.position)
    .limit(limit);
}

export async function recordQuoteScore(db: Db, id: string, striking: number, version: number) {
  await db.update(quote).set({ striking, strikingVersion: version }).where(eq(quote.id, id));
}
