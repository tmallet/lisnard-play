# Architecture

Description du système tel qu'il est construit. Le « pourquoi » des choix est
dans les [ADR](../decisions/README.md), le comportement attendu dans
[`openspec/specs/`](../../openspec/specs).

Pages détaillées :
- [commandes.md](commandes.md) : commandes du quotidien ;
- [classifier.md](classifier.md) : modèle, questions, seuils, calibration ;
- [deploiement.md](deploiement.md) : Coolify, variables d'environnement, sauvegardes ;
- [devcontainer.md](devcontainer.md) : environnement et pare-feu.

## Vue d'ensemble

```
 Sources publiques                 worker (Bun, apps/worker)              Postgres
 ┌──────────────────────┐   ┌──────────────────────────────────────┐   ┌──────────┐
 │ flux RSS YouTube     │──▶│ collecte : pré-filtre « Lisnard »,   │──▶│ source   │
 │ playlist « uploads » │   │   seuil 31/03/2026, dédoublonnage    │   │ item     │
 │ API YouTube Data     │   │ classification : Jev (OpenRouter)    │──▶│ classifi-│
 │ Google News (RSS)    │   │   règle de publication + journal     │   │  cation  │
 └──────────────────────┘   │ médias : oEmbed / Open Graph (SSRF)  │──▶│ (journal)│
                            └──────────────────────────────────────┘   └────┬─────┘
                                                                            │ lecture
 Navigateur / iOS / Android ── HTTPS /api/trpc ──▶ app (Bun, apps/app) ─────┘
                                                   pages pré-rendues + API tRPC
```

- **Le worker écrit, le backend lit** (ADR 0017). Les clients n'accèdent
  jamais à la base.
- **Un contenu n'est visible** qu'une fois publié (règle de l'ADR 0018) **et**
  doté d'un rendu média (lecteur intégré ou carte de lien).

## Modules

```
lisnard-play/
├─ apps/app/              @lisnard/app : Expo Router (web, iOS, Android) + API routes
│  ├─ src/app/            routes
│  │  ├─ _layout.tsx      racine : CSS, polices, ApiProvider, Stack, thème de navigation
│  │  ├─ +html.tsx        document HTML web (lang, balises communes)
│  │  ├─ (tabs)/          accueil (flux d'interventions) et à-propos
│  │  ├─ interventions/[id].tsx   détail (rendu côté client, ADR 0011)
│  │  ├─ +not-found.tsx   404
│  │  └─ api/trpc/[trpc]+api.ts   point d'accès tRPC (connexion Postgres partagée)
│  ├─ src/components/     Screen, WebChrome, AppNavigation, InterventionFeed,
│  │                      InterventionCard, LiveBadge, ThemeFilter, MediaEmbed, LinkCard…
│  ├─ src/config/         identity.json (nom), app.ts, navigation.ts
│  ├─ src/lib/            client tRPC, URL de l'API, formats (dates, libellés)
│  ├─ src/theme/          colors.ts, fonts.ts
│  ├─ shims/bun.js        module `bun` pour Metro → objet global Bun (ADR 0019)
│  ├─ server.ts           serveur de production (adaptateur Bun d'expo-server)
│  └─ Dockerfile
├─ apps/worker/           @lisnard/worker : ingestion
│  ├─ src/index.ts        démarrage : migrations, sources, verrou de leader, boucle
│  ├─ src/scheduler.ts    tâches à cadence propre + advisory lock Postgres
│  ├─ src/sources/        youtube.ts (RSS, playlist, videos.list), rss.ts
│  ├─ src/sources.config.ts   sources déclarées (chaînes vérifiées)
│  ├─ src/collect.ts      collecte, rattrapage, revérification des directs
│  ├─ src/classifier/     questions, client System One, seuils, règle de décision
│  ├─ src/publish.ts      classification, recompute, reclassify
│  ├─ src/media/          lecture d'URL sécurisée, oEmbed / Open Graph
│  ├─ src/calibrate.ts    calibration sur eval/reference.jsonl
│  ├─ src/cli.ts          recompute, reclassify, calibrate, backfill
│  └─ Dockerfile
├─ packages/api/          @lisnard/api : routeur tRPC (health, interventions)
├─ packages/db/           @lisnard/db : schéma Drizzle, migrations, client Bun.sql,
│                         points d'entrée read (backend) / write (worker)
├─ scripts/               docs-check.ts, smoke-web.ts
├─ compose.yaml           Postgres local (port 5433)
└─ .devcontainer/         environnement + Postgres + pare-feu
```

## Schéma de données (`packages/db/src/schema.ts`)

| Table | Rôle | Points clés |
|-------|------|-------------|
| `source` | Sources configurées, recopiées depuis `sources.config.ts` | `id` (« yt:bfmtv »), `kind`, `name`, `active` |
| `item` | Un contenu, quel que soit le nombre de sources qui l'ont trouvé | `platform_id` unique (« yt:<id> » ou hash d'URL), `outlet` (média réel), `live_status`, `status` / `role` / `kind` / `themes` (`text[]`, index GIN) dénormalisés depuis la dernière décision, `media` (rendu) |
| `classification` | Journal des décisions, en ajout seul | `model` (instantané servi), `questions_version`, `input_hash`, `answers` (probabilités brutes), `thresholds`, `outcome` |

- **Empreinte d'entrée** : un contenu n'est (re)classé que si son empreinte
  change. Elle est calculée en SQL (`inputHashSql`) à partir des champs envoyés
  au modèle et de la version des questions.
- **Statut temporel exposé** (`live` / `upcoming` / `past`) : calculé à la
  requête (`packages/db/src/read.ts`).

## Cycle du worker

| Tâche | Cadence | Effet |
|-------|---------|-------|
| `backfill:youtube` | démarrage, puis 24 h | toutes les vidéos des chaînes officielles depuis le 31/03/2026 (ADR 0018) |
| `collect:youtube` | 3 min | flux RSS des chaînes, enrichissement `videos.list`, revérification des directs |
| `collect:rss` | 15 min | Google News |
| `classify` | 30 s | contenus en attente ou modifiés → Jev → décision journalisée |
| `media` | 30 s | rendu des contenus publiés sans rendu (ils deviennent visibles) |

Une seule instance travaille à la fois (verrou de session Postgres). La
pulsation (`HEARTBEAT_FILE`) sert de healthcheck.

## Flux d'une requête web

```
Navigateur ── GET /interventions/<id> ─▶ server.ts ── HTML pré-rendu (gabarit)
    │  hydratation
    └── GET /api/trpc/interventions.byId ─▶ [trpc]+api.ts ─▶ @lisnard/db/read ─▶ Postgres
```

Pages **pré-rendues au build** en SDK 57, API routes dynamiques (ADR 0011).
Le SSR par requête, et donc les métadonnées par intervention, arrivera avec le
SDK 58. Sur mobile, le client appelle `${EXPO_PUBLIC_API_URL}/api/trpc`.

## Contrat tRPC

- Procédures : `health`, `interventions.list` (statut, thème, curseur,
  `limit ≤ 50`), `interventions.byId` (`NOT_FOUND`). Les éléments exposent
  `themes` ; le rôle n'est pas exposé, puisque tout contenu publié est
  `national` (ADR 0020).
- Le client importe uniquement le type `AppRouter`. Garde-fou de typage :
  `apps/app/src/lib/api-contract.typecheck.ts`.
- Erreurs : pas de pile d'appels ni de message interne en production, erreurs
  zod aplaties (ADR 0013).

## Style et charte

- Tokens dans `apps/app/src/global.css`. Les valeurs JS (options natives,
  `+html`) viennent de `src/theme/`. Règles complètes : skill `charte-ui`,
  ADR 0001 et 0012.
- Le dégradé est posé à la racine sur le web, et redessiné par `Screen` sur
  mobile, où les onglets natifs masquent la racine.
- Indicateur « en direct » : émeraude.

## Qualité

`bun run check` est la commande de référence : format, lint, types, tests
(Postgres requis) et `docs:check`. La CI y ajoute le smoke test web (serveur
Bun de production et base jetable). Voir [commandes.md](commandes.md).
