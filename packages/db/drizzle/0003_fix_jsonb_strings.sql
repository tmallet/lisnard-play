-- Corrige les valeurs jsonb stockées comme chaînes JSON (double encodage du driver,
-- voir le type jsonb personnalisé de schema.ts). Idempotent.
UPDATE "classification" SET "answers" = ("answers" #>> '{}')::jsonb WHERE jsonb_typeof("answers") = 'string';--> statement-breakpoint
UPDATE "classification" SET "thresholds" = ("thresholds" #>> '{}')::jsonb WHERE jsonb_typeof("thresholds") = 'string';--> statement-breakpoint
UPDATE "item" SET "media" = ("media" #>> '{}')::jsonb WHERE jsonb_typeof("media") = 'string';
