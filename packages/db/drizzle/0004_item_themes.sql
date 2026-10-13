ALTER TABLE "item" ADD COLUMN "themes" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
CREATE INDEX "item_themes_idx" ON "item" USING gin ("themes");