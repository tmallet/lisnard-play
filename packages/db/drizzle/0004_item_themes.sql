DROP INDEX "item_status_role_date_idx";--> statement-breakpoint
ALTER TABLE "item" ADD COLUMN "themes" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
CREATE INDEX "item_status_date_idx" ON "item" USING btree ("status",coalesce("starts_at", "published_at"),"id");--> statement-breakpoint
CREATE INDEX "item_themes_idx" ON "item" USING gin ("themes");