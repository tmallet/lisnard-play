import { sql } from 'drizzle-orm';
import {
  type AnyPgColumn,
  boolean,
  customType,
  date,
  doublePrecision,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

/**
 * jsonb transmis au driver Bun.sql sous forme d'objet. Le type jsonb standard de
 * Drizzle sérialise en chaîne, que Bun.sql réencode : la valeur serait stockée comme
 * une chaîne JSON au lieu d'un objet (constaté le 2026-10-13).
 */
const jsonb = <T>(name: string) =>
  customType<{ data: T; driverData: unknown }>({
    dataType: () => 'jsonb',
    toDriver: (value) => value,
    fromDriver: (value) => (typeof value === 'string' ? JSON.parse(value) : value) as T,
  })(name);

/** Types de source (design D3). */
export const sourceKind = pgEnum('source_kind', ['youtube', 'rss']);

/** Statut de diffusion fourni par la plateforme (spec intervention-collection). */
export const liveStatus = pgEnum('live_status', ['none', 'upcoming', 'live', 'ended']);

/** Statut de publication, dénormalisé depuis la dernière classification (ADR 0017). */
export const itemStatus = pgEnum('item_status', ['pending', 'published', 'rejected']);

/** Rôle de l'intervention : seul `national` est publiable (ADR 0020). */
export const interventionRole = pgEnum('intervention_role', [
  'national',
  'amf',
  'mairie',
  'hors_sujet',
]);

/** Type d'intervention (spec intervention-classification). */
export const interventionKind = pgEnum('intervention_kind', [
  'tv',
  'radio',
  'presse',
  'podcast',
  'meeting',
  'discours',
  'stream',
  'reseau_social',
]);

/**
 * Thèmes de campagne (ADR 0020, spec intervention-themes). Liste fermée, versionnée
 * avec les questions du classifieur ; stockée en `text[]` (design D3).
 */
export const THEMES = [
  'economy',
  'security',
  'immigration',
  'education',
  'institutions',
  'international',
  'campaign',
] as const;
export type Theme = (typeof THEMES)[number];

export function isTheme(value: string): value is Theme {
  return (THEMES as readonly string[]).includes(value);
}

export const classificationOutcome = pgEnum('classification_outcome', ['published', 'rejected']);

/** Rendu média calculé à l'ingestion (ADR 0007, spec intervention-media). */
export type MediaRender =
  | { kind: 'embed'; provider: 'youtube' | 'dailymotion'; embedUrl: string }
  | {
      kind: 'link';
      og: { title?: string; image?: string; siteName?: string; description?: string };
      /** URL de l'article chez l'éditeur, pour un lien d'agrégateur (ADR 0021). */
      url?: string;
    };

/** Résumé d'une vidéo (spec intervention-summaries, ADR 0021) : seul le dernier fait foi. */
export type SummaryRecord = {
  model: string;
  promptVersion: number;
  /** ISO 8601. */
  generatedAt: string;
  /** Coût en dollars, pour le plafond quotidien. */
  cost: number;
} & (
  | { kind: 'ok'; text: string; points: string[] }
  | { kind: 'none'; reason: 'not_speaking' | 'failed' | 'too_long' }
);

/**
 * Lieu d'une intervention (spec intervention-places, ADR 0027). `onSite` faux : aucun
 * déplacement (plateau, studio, presse, lieu inconnu). Coordonnées absentes : hors de
 * France ou introuvable.
 */
export interface PlaceRecord {
  onSite: boolean;
  /** Lieu tel que formulé par le modèle (« Saint-Raphaël (Var) », « Alsace »). */
  label: string | null;
  /** Commune ou zone retenue par la géolocalisation. */
  city: string | null;
  lat: number | null;
  lon: number | null;
  /** Centre d'une région ou d'un département plutôt qu'une commune. */
  approximate: boolean;
  /**
   * Commune et département répondus par le modèle, gardés tant que la géolocalisation
   * n'a pas abouti (Base adresse nationale indisponible) : elle est refaite sans
   * rappeler le modèle.
   */
  query?: { city: string; department: string } | null;
  geocodePending?: boolean;
  /** Abandon après plusieurs réponses inexploitables du modèle. */
  failed?: boolean;
  model: string;
  promptVersion: number;
  /** ISO 8601. */
  generatedAt: string;
  cost: number;
}

/** Réponses brutes du classifieur, telles que journalisées (ADR 0005). */
export interface ClassifierAnswers {
  intervient: number;
  role: { choice: string; confidence: number; probabilities: Record<string, number> };
  kind: { choice: string; confidence: number; probabilities: Record<string, number> };
  /** Probabilité par thème (questions v3) ; absente des décisions antérieures. */
  themes?: Partial<Record<Theme, number>>;
}

export interface AppliedThresholds {
  intervient: number;
  role: number;
  /** Seuil d'attribution d'un thème (ADR 0020) ; absent des décisions antérieures. */
  theme?: number;
}

/** Sources déclarées en configuration du worker, recopiées ici pour les clés étrangères. */
export const source = pgTable('source', {
  id: text('id').primaryKey(),
  kind: sourceKind('kind').notNull(),
  name: text('name').notNull(),
  active: boolean('active').notNull().default(true),
  /** Chaîne officielle de David Lisnard (recopiée depuis sources.config.ts, ADR 0018). */
  official: boolean('official').notNull().default(false),
});

/** Contenu candidat ou intervention (une ligne par contenu, quel que soit le nombre de sources). */
export const item = pgTable(
  'item',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sourceId: text('source_id')
      .notNull()
      .references(() => source.id),
    /** Identité du contenu : identifiant plateforme (« yt:<id> ») ou hash de l'URL canonique. */
    platformId: text('platform_id').notNull().unique(),
    url: text('url').notNull(),
    /** Média réel quand il diffère de la source (ex. éditeur d'un article relayé par Google News). */
    outlet: text('outlet'),
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    publishedAt: timestamp('published_at', { withTimezone: true }).notNull(),
    startsAt: timestamp('starts_at', { withTimezone: true }),
    endsAt: timestamp('ends_at', { withTimezone: true }),
    liveStatus: liveStatus('live_status').notNull().default('none'),
    thumbnailUrl: text('thumbnail_url'),
    status: itemStatus('status').notNull().default('pending'),
    role: interventionRole('role'),
    kind: interventionKind('kind'),
    /** Thèmes dénormalisés depuis la dernière décision (spec intervention-themes). */
    themes: text('themes').array().notNull().default(sql`'{}'::text[]`),
    media: jsonb<MediaRender>('media'),
    /** Durée de la vidéo en secondes (videos.list), quand elle est connue. */
    durationS: integer('duration_s'),
    summary: jsonb<SummaryRecord>('summary'),
    /** Lieu du déplacement, ou son absence ; null tant qu'il n'a pas été déterminé. */
    place: jsonb<PlaceRecord>('place'),
    /** Échecs consécutifs de détermination du lieu (plafond, comme pour les résumés). */
    placeAttempts: integer('place_attempts').notNull().default(0),
    /** Pas de nouvel essai avant cette date (attente croissante après un échec). */
    placeRetryAt: timestamp('place_retry_at', { withTimezone: true }),
    /** Échecs consécutifs de production du résumé (plafond de tentatives). */
    summaryAttempts: integer('summary_attempts').notNull().default(0),
    /** Pas de nouvel essai de résumé avant cette date (attente croissante après un échec). */
    summaryRetryAt: timestamp('summary_retry_at', { withTimezone: true }),
    /**
     * Reprise d'un article déjà enregistré (même titre, autre média) : masquée partout,
     * gardée pour la traçabilité (spec intervention-collection, « Dédoublonnage »).
     */
    duplicateOf: uuid('duplicate_of').references((): AnyPgColumn => item.id, {
      onDelete: 'set null',
    }),
    firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('item_status_live_idx').on(t.status, t.liveStatus, t.startsAt),
    // Sert le tri et le curseur du flux (listPublished) : statut, date d'affichage, id.
    index('item_status_date_idx').on(
      t.status,
      sql`coalesce(${t.startsAt}, ${t.publishedAt})`,
      t.id,
    ),
    index('item_themes_idx').using('gin', t.themes),
  ],
);

/** Journal des décisions du classifieur : ajout seul (ADR 0005, ADR 0017). */
/**
 * Dépense en résumés par jour (heure de Paris) : chaque appel payé s'y ajoute, y compris
 * une réponse invalide ou un résumé remplacé ensuite (plafond quotidien, ADR 0021).
 */
export const summarySpend = pgTable('summary_spend', {
  day: date('day').primaryKey(),
  cost: doublePrecision('cost').notNull().default(0),
});

export const classification = pgTable(
  'classification',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    itemId: uuid('item_id')
      .notNull()
      .references(() => item.id, { onDelete: 'cascade' }),
    /** Instantané effectivement servi (ex. « typesafe/jev-1.13-20260917 »). */
    model: text('model').notNull(),
    questionsVersion: integer('questions_version').notNull(),
    /** Hash de l'état envoyé et de la version des questions (cache, design D4). */
    inputHash: text('input_hash').notNull(),
    answers: jsonb<ClassifierAnswers>('answers').notNull(),
    /** null : aucun seuil défini pour le modèle, publication bloquée. */
    thresholds: jsonb<AppliedThresholds>('thresholds'),
    outcome: classificationOutcome('outcome').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('classification_item_created_idx').on(t.itemId, t.createdAt)],
);

/** Service d'envoi d'un abonnement aux notifications (ADR 0024). */
export const pushKind = pgEnum('push_kind', ['web', 'expo']);

/** Types de notification (spec push-notifications). */
export const notificationKind = pgEnum('notification_kind', ['live', 'reminder', 'new_item']);

/** Clés de chiffrement d'un abonnement Web Push (RFC 8291). */
export interface WebPushKeys {
  p256dh: string;
  auth: string;
}

/**
 * Abonnement d'un appareil aux notifications (ADR 0024). Seule table que l'API écrit,
 * par `@lisnard/db/subscriptions`. `endpoint` : adresse Web Push ou jeton Expo.
 */
export const pushSubscription = pgTable('push_subscription', {
  id: uuid('id').primaryKey().defaultRandom(),
  kind: pushKind('kind').notNull(),
  endpoint: text('endpoint').notNull().unique(),
  keys: jsonb<WebPushKeys>('keys'),
  live: boolean('live').notNull().default(true),
  reminder: boolean('reminder').notNull().default(true),
  newItem: boolean('new_item').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  /** Dernière confirmation par l'appareil : purge après 13 mois sans confirmation. */
  confirmedAt: timestamp('confirmed_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Journal des envois : un événement par intervention et par type, au plus (design D5). */
export const notificationSent = pgTable(
  'notification_sent',
  {
    itemId: uuid('item_id')
      .notNull()
      .references(() => item.id, { onDelete: 'cascade' }),
    kind: notificationKind('kind').notNull(),
    recipients: integer('recipients').notNull().default(0),
    sentAt: timestamp('sent_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.itemId, t.kind] })],
);

export type PushSubscription = typeof pushSubscription.$inferSelect;
export type NotificationKind = (typeof notificationKind.enumValues)[number];

export type Source = typeof source.$inferSelect;
export type Item = typeof item.$inferSelect;
export type NewItem = typeof item.$inferInsert;
export type Classification = typeof classification.$inferSelect;
