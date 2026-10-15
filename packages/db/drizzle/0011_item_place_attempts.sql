ALTER TABLE "item" ADD COLUMN "place_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "item" ADD COLUMN "place_retry_at" timestamp with time zone;