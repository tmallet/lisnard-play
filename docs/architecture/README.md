# Architecture

Description du système tel qu'il est construit. Le « pourquoi » des choix est
dans les [ADR](../decisions/README.md), le comportement attendu dans
[`openspec/specs/`](../../openspec/specs).

Pages détaillées :
- [commandes.md](commandes.md) : commandes du quotidien ;
- [classifier.md](classifier.md) : modèle, questions, seuils, calibration ;
- [resumes.md](resumes.md) : résumés des vidéos (Gemini) et cartes des articles ;
- [deploiement.md](deploiement.md) : Coolify, variables d'environnement, sauvegardes ;
- [devcontainer.md](devcontainer.md) : environnement et pare-feu.

## Vue d'ensemble

```
 Sources publiques                 worker (Bun, apps/worker)              Postgres
 ┌──────────────────────┐   ┌──────────────────────────────────────┐   ┌──────────┐
 │ push WebSub YouTube  │──▶│ voie rapide : vidéo notifiée classée │   │          │
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
│  ├─ src/app/            routes (onglets : accueil, campagne, à propos)
│  │  ├─ _layout.tsx      racine : CSS, polices, ApiProvider, Stack, thème de navigation
│  │  ├─ +html.tsx        document HTML web (lang, balises communes)
│  │  ├─ (tabs)/          accueil (flux d'interventions) et à-propos
│  │  ├─ interventions/[id].tsx   détail (rendu côté client, ADR 0011), `?t=` pour un minutage
│  │  ├─ interventions/[id]/citation/[t].tsx   page d'une citation (ADR 0028)
│  │  ├─ +not-found.tsx   404
│  │  ├─ sitemap.xml+api.ts   plan du site (interventions et citations), cache de 10 min
│  │  │  (…/citation/<s>/image.png et apercu.png : images d'une citation, carrée et
│  │  │   paysage, servies par server.ts avec satori et resvg, hors Metro, ADR 0029 ;
│  │  │   en-tête des pages de citation réécrit par server.ts pour les aperçus de
│  │  │   lien, ADR 0030)
│  │  └─ api/trpc/[trpc]+api.ts   point d'accès tRPC (connexion Postgres partagée, src/server/db.ts)
│  ├─ src/components/     Screen, WebChrome, AppNavigation, InterventionFeed,
│  │                      InterventionCard, LiveBadge, ThemeFilter, MediaEmbed, LinkCard…
│  ├─ src/config/         identity.json (nom), app.ts, navigation.ts
│  ├─ src/lib/            client tRPC, URL de l'API, formats (dates, libellés)
│  ├─ src/theme/          colors.ts, fonts.ts
│  ├─ shims/bun.js        module `bun` pour Metro → objet global Bun (ADR 0019)
│  ├─ server.ts           serveur de production (adaptateur Bun d'expo-server)
│  └─ Dockerfile
├─ apps/admin/            @lisnard/admin : backoffice sous /admin (ADR 0032), service
│                         séparé relayé par server.ts ; Better Auth (mot de passe + TOTP),
│                         API tRPC d'administration, interface Refine + shadcn/ui (ui/)
├─ apps/worker/           @lisnard/worker : ingestion
│  ├─ src/index.ts        démarrage : migrations, sources, verrou de leader, boucle
│  ├─ src/scheduler.ts    tâches à cadence propre + advisory lock Postgres
│  ├─ src/sources/        youtube.ts (RSS, playlist, videos.list), rss.ts
│  ├─ src/sources.config.ts   sources déclarées (chaînes vérifiées)
│  ├─ src/collect.ts      collecte, rattrapage, revérification des directs
│  ├─ src/classifier/     questions, client System One, seuils, règle de décision
│  ├─ src/publish.ts      classification, recompute, reclassify
│  ├─ src/media/          lecture d'URL sécurisée, oEmbed / Open Graph, liens Google News
│  ├─ src/summaries/      résumés des vidéos : consigne, client OpenRouter (Gemini), tâche
│  ├─ src/websub/         notifications push YouTube : serveur, abonnements, voie rapide
│  ├─ src/notifications/  envoi des notifications : Web Push (VAPID), Expo Push, tâche notify
│  ├─ src/places/         lieu des déplacements : consigne, modèle, Base adresse nationale
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
| `item` | Un contenu, quel que soit le nombre de sources qui l'ont trouvé | `platform_id` unique (« yt:<id> » ou hash d'URL), `outlet` (média réel), `live_status`, `status` / `role` / `kind` / `themes` (`text[]`, index GIN) dénormalisés depuis la dernière décision, `duplicate_of` (reprise d'un article déjà enregistré, masquée partout), `place` (lieu du déplacement, ou son absence), `media` (rendu, dont l'URL de l'éditeur pour un article Google News), `summary` (résumé ou motif d'absence), `duration_s` |
| `admin_action` | Journal des actions du backoffice, en ajout seul (ADR 0032) | `kind` (`hide`, `unhide`, `request_summary`), `item_id`, `reason`, `at` |
| `auth_*` | Tables de Better Auth (compte unique, sessions, TOTP), écrites par le service admin seul | `auth_user`, `auth_session`, `auth_account`, `auth_verification`, `auth_two_factor` |
| `quote` | Citations horodatées d'une vidéo, remplacées avec son résumé (ADR 0028) | `item_id` (cascade), `start_s` (unique par vidéo), `text`, `search` (texte normalisé par `lp_normalize`, index plein texte français), `striking` et `striking_version` (note « marquante » de Jev, ADR 0031) ; un index plein texte couvre aussi titre et résumé de `item` |
| `push_subscription` | Abonnements aux notifications, **écrits par l'API** (ADR 0024) | `kind` (`web` / `expo`), `endpoint` unique (adresse Web Push ou jeton Expo), `keys`, préférences `live` / `reminder` / `new_item`, `confirmed_at` (purge à 13 mois) |
| `notification_sent` | Envois effectués, un par intervention et par type | clé (`item_id`, `kind`), `recipients` |
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
| `websub:subscribe` | démarrage, puis 24 h | abonnement de chaque chaîne au hub WebSub (si configuré, ADR 0023) |
| `collect:youtube` | 3 min | flux RSS des chaînes, enrichissement `videos.list`, revérification des directs |
| `recheck:soon` | 30 s | directs programmés dans le quart d'heure : statut revérifié (aucun appel sinon) |
| `collect:rss` | 15 min | Google News |
| `notify` | 30 s (et après la voie rapide WebSub) | notifications : début de direct, rappel à 15 min, nouvelle intervention, une vidéo attendant son résumé 10 min au plus ; titre court avec emoji, titre de l'intervention et première phrase du résumé dans le texte (ADR 0024) |
| `quotes:score` | 5 min | note « marquante » des citations par Jev, une fois par version de la question, pour les récapitulatifs (ADR 0031) |
| `places` | 5 min | lieu des déplacements : modèle sur titre et description, puis Base adresse nationale ; plafond partagé avec les résumés (ADR 0027) |
| `notify:purge` | 24 h | abonnements sans confirmation depuis 13 mois |
| `classify` | 30 s | contenus en attente ou modifiés → Jev → décision journalisée |
| `media` | 30 s | rendu des contenus publiés sans rendu (ils deviennent visibles) |
| `summarize` | 2 min | résumé des vidéos publiées, dans la limite du plafond quotidien (ADR 0021) |

Une seule instance travaille à la fois (verrou de session Postgres). La
pulsation (`HEARTBEAT_FILE`) sert de healthcheck.

**Détection des directs** (ADR 0023) : quand `WEBSUB_CALLBACK_URL` et
`WEBSUB_SECRET` sont définies, le leader démarre un serveur HTTP
(`/websub/youtube`, port `WEBSUB_PORT`). Une notification signée déclenche,
hors de la boucle et une à la fois : `videos.list` pour la vidéo, enregistrement,
classement, rendu du lecteur. Un direct apparaît ainsi en quelques secondes ; l'app
rafraîchit « En direct » et « À venir » toutes les 30 s et au retour au premier plan.

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
  `limit ≤ 50`), `interventions.byId` (`NOT_FOUND`), `notifications.config`,
  `notifications.subscribe` / `update` / `unsubscribe` (seules écritures de l'API,
  dans `push_subscription`, ADR 0024), `membership.timeline` (adhérents de Nouvelle
  Énergie lus sur le site du parti avec un cache de 90 s, et interventions posées sur la
  courbe ; aucune copie en base, ADR 0026), `recap.get` et `recap.list` (récapitulatifs du jour et de la semaine, avec les adhésions,
  ADR 0031), `campaign.places` (déplacements regroupés
  par lieu pour la carte, ADR 0027), `quotes.at` (citation à 5 s près) et
  `search.query` (citations puis interventions, cache d'une minute, ADR 0028). Les éléments exposent
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
