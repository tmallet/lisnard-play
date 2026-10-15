-- Recherche plein texte (spec intervention-quotes, ADR 0028) : normalisation sans
-- accents par une fonction immuable, sans l'extension unaccent.
CREATE OR REPLACE FUNCTION lp_normalize(input text) RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT replace(replace(translate(lower(coalesce(input, '')),
    'àâäáãåçéèêëíìîïñóòôöõúùûüýÿ’''«»“”',
    'aaaaaaceeeeiiiinooooouuuuyy      '),
    'œ', 'oe'), 'æ', 'ae')
$$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS quote_search_idx ON quote USING gin (to_tsvector('french', search));
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS item_search_idx ON item USING gin (
  to_tsvector('french', lp_normalize(title || ' ' || coalesce(summary->>'text', '')))
);
