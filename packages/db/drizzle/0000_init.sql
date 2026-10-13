CREATE TYPE "public"."classification_outcome" AS ENUM('published', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."intervention_kind" AS ENUM('tv', 'radio', 'presse', 'podcast', 'meeting', 'discours', 'stream', 'reseau_social');--> statement-breakpoint
CREATE TYPE "public"."intervention_role" AS ENUM('national', 'amf', 'mairie', 'hors_sujet');--> statement-breakpoint
CREATE TYPE "public"."item_status" AS ENUM('pending', 'published', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."live_status" AS ENUM('none', 'upcoming', 'live', 'ended');--> statement-breakpoint
CREATE TYPE "public"."source_kind" AS ENUM('youtube', 'rss');--> statement-breakpoint
CREATE TABLE "classification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"model" text NOT NULL,
	"questions_version" integer NOT NULL,
	"input_hash" text NOT NULL,
	"answers" jsonb NOT NULL,
	"thresholds" jsonb NOT NULL,
	"outcome" "classification_outcome" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" text NOT NULL,
	"platform_id" text NOT NULL,
	"url" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"published_at" timestamp with time zone NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"live_status" "live_status" DEFAULT 'none' NOT NULL,
	"thumbnail_url" text,
	"status" "item_status" DEFAULT 'pending' NOT NULL,
	"role" "intervention_role",
	"kind" "intervention_kind",
	"media" jsonb,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "item_platform_id_unique" UNIQUE("platform_id")
);
--> statement-breakpoint
CREATE TABLE "source" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" "source_kind" NOT NULL,
	"name" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "classification" ADD CONSTRAINT "classification_item_id_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item" ADD CONSTRAINT "item_source_id_source_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."source"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "classification_item_created_idx" ON "classification" USING btree ("item_id","created_at");--> statement-breakpoint
CREATE INDEX "item_status_live_idx" ON "item" USING btree ("status","live_status","starts_at");--> statement-breakpoint
CREATE INDEX "item_status_role_date_idx" ON "item" USING btree ("status","role",coalesce("starts_at", "published_at"));