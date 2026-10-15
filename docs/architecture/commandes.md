# Commandes

Toutes les commandes se lancent depuis la racine du dépôt, où se trouve le
`.env` local.

## Prérequis

Les versions de Bun et Node sont épinglées dans `.tool-versions` (ADR 0010) :

```bash
asdf install
```

Les CLI globales (`openspec`, `codex`…) doivent être installées pour la
version de Node du projet, puisque asdf choisit la version selon le dossier.

Base de données locale (Postgres 18, port 5433, ADR 0014) :

```bash
docker compose up -d
```

Copier `.env.example` en `.env` et renseigner les clés du worker
(`OPENROUTER_API_KEY`, `YOUTUBE_API_KEY`). Ou bien travailler dans le
devcontainer, qui fournit Postgres : voir [devcontainer.md](devcontainer.md).

## Quotidien

| Commande | Effet |
|----------|-------|
| `bun install` | Installe les dépendances (arborescence « hoisted », voir `bunfig.toml`) |
| `bun run dev` | Lance Metro **sous le runtime Bun** (web, iOS, Android, API routes) avec le `.env` racine (ADR 0019) |
| `bun apps/worker/src/index.ts` | Lance le worker en local (migrations, puis boucle de collecte et de classification) |
| `bun run check` | Format et lint (Biome), types, tests (Postgres requis), `docs:check`. **À lancer avant de conclure une tâche** |
| `bun run format` | Formate tout le dépôt (Biome) |
| `bun run smoke:web` | Export de production, serveur Bun et base jetable, puis vérifications HTTP sans JavaScript |
| `bunx web-push generate-vapid-keys` | Génère la paire de clés des notifications web (une fois par environnement, ADR 0024) |
| `bun scripts/build-france-map.ts <régions métropole> <régions avec outre-mer>` | Régénère le fond de carte `apps/app/assets/france-map.json` à partir des GeoJSON de france-geojson (IGN, Licence Ouverte) |
| `bun run docs:check` | Cohérence des ADR, de l'index, des liens, des skills, des versions d'outils et des Dockerfiles |

Options du smoke test : `SMOKE_PORT` (8091 par défaut), `SKIP_EXPORT=1` pour
réutiliser `apps/app/dist`.

## Worker : exploitation (`apps/worker/src/cli.ts`)

| Commande | Effet |
|----------|-------|
| `bun apps/worker/src/cli.ts backfill` | Rattrape toutes les vidéos des chaînes officielles depuis le 31/03/2026 |
| `bun apps/worker/src/cli.ts calibrate --validated [--model M]` | Mesure précision et rappel sur le jeu de référence (modèle épinglé par défaut), et propose des seuils |
| `bun apps/worker/src/cli.ts recompute` | Applique les seuils et la règle actuels aux décisions journalisées (sans appel au modèle) |
| `bun apps/worker/src/cli.ts reclassify [--model M] [--version N]` | Reclasse en rappelant le modèle |
| `bun apps/worker/src/cli.ts summarize [--budget N] [--retry]` | Résume les vidéos jusqu'au plafond du jour (N $) ; `--retry` relance les abandons |
| `bun apps/worker/src/cli.ts notify --test` | Envoie une notification de test à tous les abonnés (vérifie les clés VAPID et la chaîne d'envoi) |
| `bun apps/worker/src/cli.ts media --refresh [--source ID]` | Recalcule le rendu des contenus publiés (cartes des articles Google News) |

Procédures du classifieur : [classifier.md](classifier.md). Résumés : [resumes.md](resumes.md).

## Base de données (`packages/db`)

| Commande | Effet |
|----------|-------|
| `bun --filter @lisnard/db db:generate` | Génère une migration SQL après une modification de `schema.ts` |
| `bun --filter @lisnard/db db:studio` | Drizzle Studio : consulter et modifier les données locales |

Les migrations s'appliquent au démarrage du worker. Les tests créent chacun une
base jetable (`@lisnard/db/testing`).

## Par workspace

| Commande | Effet |
|----------|-------|
| `bun --filter @lisnard/app export:web` | Export web dans `apps/app/dist` |
| `bun --filter @lisnard/app start` | Sert `dist/` avec le serveur Bun de production (`server.ts`) |
| `bun --filter @lisnard/worker build` | Empaquette `index.js` et `cli.js` dans `apps/worker/dist` |
| `bun --filter @lisnard/api test` | Tests du routeur (Postgres) |
| `bun --filter @lisnard/app test` | Tests jest-expo des composants |

Dans `apps/app`, ajouter une dépendance avec `bunx expo install <paquet>`
(versions compatibles avec le SDK).

## Images Docker

```bash
docker build -f apps/app/Dockerfile -t lisnard-app .
```

```bash
docker build -f apps/worker/Dockerfile -t lisnard-worker .
```

Déploiement : [deploiement.md](deploiement.md).

## Variables d'environnement

Voir `.env.example`. Un fichier `.env*` n'est jamais commité (sauf `.env.example`).

| Variable | Usage |
|----------|-------|
| `DATABASE_URL` | Postgres (local : `postgres://lisnard:lisnard@localhost:5433/lisnard`) |
| `OPENROUTER_API_KEY` | Worker : classifieur Jev et résumés (Gemini) |
| `YOUTUBE_API_KEY` | Worker : API YouTube Data |
| `SUMMARY_DAILY_BUDGET_USD` | Worker : plafond quotidien des résumés, en dollars (1 par défaut) |
| `ALLOW_INDEXING` | Serveur web : `true` lève le blocage de l'indexation (bloquée par défaut) |
| `EXPO_PUBLIC_API_URL` | URL de base de l'API pour les clients mobiles hors développement |
| `EXPO_PUBLIC_SITE_URL` | Origine déclarée par le lecteur vidéo mobile (défaut : `https://lisnardplay.thimal.fr`) |

## CI

`.github/workflows/ci.yml`, sur chaque PR et sur `main`, avec un service
Postgres 18 :

1. Bun et Node installés depuis `.tool-versions` ;
2. `bun install --frozen-lockfile` ;
3. `bun run check` ;
4. `bun run smoke:web`.
