CREATE TABLE "summary_spend" (
	"day" date PRIMARY KEY NOT NULL,
	"cost" double precision DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "item" ADD COLUMN "summary_retry_at" timestamp with time zone;