import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

/** Types de source (design D3). */
export const sourceKind = pgEnum('source_kind', ['youtube', 'rss']);

/** Statut de diffusion fourni par la plateforme (spec intervention-collection). */
export const liveStatus = pgEnum('live_status', ['none', 'upcoming', 'live', 'ended']);

/** Statut de publication, dénormalisé depuis la dernière classification (ADR 0017). */
export const itemStatus = pgEnum('item_status', ['pending', 'published', 'rejected']);

/** Rôle de l'intervention (ADR 0006). */
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

export const classificationOutcome = pgEnum('classification_outcome', ['published', 'rejected']);

/** Rendu média calculé à l'ingestion (ADR 0007, spec intervention-media). */
export type MediaRender =
  | { kind: 'embed'; provider: 'youtube' | 'dailymotion'; embedUrl: string }
  | {
      kind: 'link';
      og: { title?: string; image?: string; siteName?: string; description?: string };
    };

/** Réponses brutes du classifieur, telles que journalisées (ADR 0005). */
export interface ClassifierAnswers {
  intervient: number;
  role: { choice: string; confidence: number; probabilities: Record<string, number> };
  kind: { choice: string; confidence: number; probabilities: Record<string, number> };
}

export interface AppliedThresholds {
  intervient: number;
  role: number;
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
    media: jsonb('media').$type<MediaRender>(),
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
    answers: jsonb('answers').$type<ClassifierAnswers>().notNull(),
    thresholds: jsonb('thresholds').$type<AppliedThresholds>().notNull(),
    outcome: classificationOutcome('outcome').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('classification_item_created_idx').on(t.itemId, t.createdAt)],
);

export type Source = typeof source.$inferSelect;
export type Item = typeof item.$inferSelect;
export type NewItem = typeof item.$inferInsert;
export type Classification = typeof classification.$inferSelect;
