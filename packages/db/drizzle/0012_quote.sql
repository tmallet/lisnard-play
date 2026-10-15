CREATE TABLE "quote" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"text" text NOT NULL,
	"search" text NOT NULL,
	"start_s" integer NOT NULL,
	"theme" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quote_item_start_unique" UNIQUE("item_id","start_s")
);
--> statement-breakpoint
ALTER TABLE "quote" ADD CONSTRAINT "quote_item_id_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "quote_item_position_idx" ON "quote" USING btree ("item_id","position");