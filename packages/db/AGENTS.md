# packages/db — @lisnard/db

Schéma, migrations et client PostgreSQL (ADR 0014) : Drizzle ORM sur le client
Postgres intégré à Bun (`drizzle-orm/bun-sql`). Vue d'ensemble :
[docs/architecture/README.md](../../docs/architecture/README.md).

## Points d'entrée

| Import | Pour qui | Contenu |
|--------|----------|---------|
| `@lisnard/db/read` | backend (`packages/api`) | interventions **publiées et dotées d'un rendu** uniquement, sans donnée interne (ADR 0017) |
| `@lisnard/db/write` | worker uniquement | upserts, journal des décisions, recalcul, rendus médias |
| `@lisnard/db/client` | tous | `createDb(url, { max, idleTimeout })` |
| `@lisnard/db/schema` | tous | tables, énumérations, types (`MediaRender`, `ClassifierAnswers`…) |
| `@lisnard/db/migrate` | worker | `runMigrations(db)` (`MIGRATIONS_DIR` dans l'image Docker) |
| `@lisnard/db/testing` | tests | `createTestDb()` : base jetable migrée, `drop()` en fin de test |

**Un import de `write` dans `packages/api/src` (hors tests) est une erreur de revue.**

## Règles

- **Modifier le schéma** : éditer `src/schema.ts`, puis lancer
  `bun --filter @lisnard/db db:generate` et commiter le SQL généré dans
  `drizzle/`. Les migrations ne font qu'ajouter, et restent compatibles avec la
  version précédente du code. Une correction de données passe par une
  migration `--custom`, idempotente.
- **jsonb** : utiliser le type `jsonb<T>()` de `schema.ts`, jamais celui de
  Drizzle. Avec Bun.sql, celui-ci stocke une chaîne JSON au lieu d'un objet
  (voir la migration `0003`).
- **Journal `classification`** : en ajout seul, on n'y fait jamais
  d'`UPDATE`. `item.status`, `role`, `kind` et `themes` sont dénormalisés à partir de la
  dernière décision (`recordClassification`, en transaction).
- **Résumés** : `item.summary` ne garde que le dernier résumé, car aucune décision
  n'en dépend. `read` n'en expose que `{ text, points }`, et seulement si
  `kind = 'ok'` (ADR 0021).
- **Visibilité** : `read` exige `status = 'published'` **et** `media is not null`.
- **Pool** : un seul client par processus. Côté API route, il est mis en cache
  sur `globalThis`, car le module est réévalué à chaque rechargement en
  développement.

## Tests

`bun --filter @lisnard/db test` : Postgres requis (`docker compose up -d`).
Chaque fichier de test crée sa propre base via `createTestDb()`.
