import { sql } from 'drizzle-orm';
import {
  boolean,
  customType,
  index,
  integer,
  pgEnum,
  pgTable,
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
  'economie',
  'securite',
  'immigration',
  'education',
  'institutions',
  'international',
  'campagne',
] as const;
export type Theme = (typeof THEMES)[number];

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
    /** Échecs consécutifs de production du résumé (plafond de tentatives). */
    summaryAttempts: integer('summary_attempts').notNull().default(0),
    firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('item_status_live_idx').on(t.status, t.liveStatus, t.startsAt),
    index('item_status_role_date_idx').on(
      t.status,
      t.role,
      sql`coalesce(${t.startsAt}, ${t.publishedAt})`,
    ),
    index('item_themes_idx').using('gin', t.themes),
  ],
);

/** Journal des décisions du classifieur : ajout seul (ADR 0005, ADR 0017). */
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

export type Source = typeof source.$inferSelect;
export type Item = typeof item.$inferSelect;
export type NewItem = typeof item.$inferInsert;
export type Classification = typeof classification.$inferSelect;
