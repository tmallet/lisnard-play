# packages/db — @lisnard/db

Schéma, migrations et client PostgreSQL (ADR 0014) : Drizzle ORM sur le client
Postgres intégré à Bun (`drizzle-orm/bun-sql`). Vue d'ensemble :
[docs/architecture/README.md](../../docs/architecture/README.md).

## Points d'entrée

| Import | Pour qui | Contenu |
|--------|----------|---------|
| `@lisnard/db/read` | backend (`packages/api`) | interventions **publiées et dotées d'un rendu** uniquement, sans donnée interne (ADR 0017) ; `listTimelineItems` pour le graphique des adhésions, `listPlaces` pour la carte des déplacements |
| `@lisnard/db/write` | worker uniquement | upserts, journal des décisions, recalcul, rendus médias, événements et envois de notifications |
| `@lisnard/db/subscriptions` | backend et worker | abonnements aux notifications (seule écriture du backend, ADR 0024), liste blanche `isPushServiceUrl` |
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
- **Récapitulatifs** : `getRecap` et `listRecapDays` comptent les jours en heure de Paris,
  comme la courbe ; la citation retenue est celle de plus haute `striking` (note Jev,
  écrite par le worker seul : `listQuotesToScore`, `recordQuoteScore`, ADR 0031).
- **Citations** : table `quote`, remplacée avec le résumé dans la même transaction
  (`recordSummary`). La recherche s'appuie sur `lp_normalize` (fonction SQL immuable,
  sans extension `unaccent`) : garder la même expression que les index de la
  migration 0013, sinon ils ne servent plus (ADR 0028).
- **Visibilité** : `read` exige `status = 'published'` **et** `media is not null`.
- **Pool** : un seul client par processus. Côté API route, il est mis en cache
  sur `globalThis`, car le module est réévalué à chaque rechargement en
  développement.

## Tests

`bun --filter @lisnard/db test` : Postgres requis (`docker compose up -d`).
Chaque fichier de test crée sa propre base via `createTestDb()`.
