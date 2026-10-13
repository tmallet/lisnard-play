ALTER TABLE "item" ADD COLUMN "duration_s" integer;--> statement-breakpoint
ALTER TABLE "item" ADD COLUMN "summary" jsonb;--> statement-breakpoint
ALTER TABLE "item" ADD COLUMN "summary_attempts" integer DEFAULT 0 NOT NULL;