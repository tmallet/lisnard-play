CREATE TYPE "public"."notification_kind" AS ENUM('live', 'reminder', 'new_item');--> statement-breakpoint
CREATE TYPE "public"."push_kind" AS ENUM('web', 'expo');--> statement-breakpoint
CREATE TABLE "notification_sent" (
	"item_id" uuid NOT NULL,
	"kind" "notification_kind" NOT NULL,
	"recipients" integer DEFAULT 0 NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_sent_item_id_kind_pk" PRIMARY KEY("item_id","kind")
);
--> statement-breakpoint
CREATE TABLE "push_subscription" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "push_kind" NOT NULL,
	"endpoint" text NOT NULL,
	"keys" jsonb,
	"live" boolean DEFAULT true NOT NULL,
	"reminder" boolean DEFAULT true NOT NULL,
	"new_item" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"confirmed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "push_subscription_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
ALTER TABLE "notification_sent" ADD CONSTRAINT "notification_sent_item_id_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."item"("id") ON DELETE cascade ON UPDATE no action;