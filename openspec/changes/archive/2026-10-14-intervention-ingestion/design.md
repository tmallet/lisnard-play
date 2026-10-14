## Context

Le socle (change `setup-foundation`) fournit le monorepo Bun, l'app Expo SDK 57
qui sert le web et l'API tRPC, et le devcontainer. Ce change ajoute la base de
données (ADR 0014), le worker (ADR 0015) et le parcours collecte →
classification → publication → consultation. Les motivations sont dans
`proposal.md`, les exigences dans `specs/`. Les décisions structurantes sont
déjà dans les ADR 0004 à 0007 et 0014 à 0016 ; ce design les assemble sans les
répéter.

Vérifié avant rédaction :
- `expo-server` 57 fournit l'adaptateur Bun (`expo-server/adapter/bun`).
- `drizzle-orm` 0.45 fournit le driver `drizzle-orm/bun-sql`.
- En SDK 57 (pré-rendu), une route dynamique `/x/[id]` est exportée comme
  gabarit, et `/x/abc` répond 200 avec un rendu côté client. Ça suffit pour une
  URL de détail partageable, avec des métadonnées génériques.

## Goals / Non-Goals

**Goals :**
- Un worker idempotent : relancer une collecte ou une classification ne crée
  ni doublon ni décision incohérente.
- Une frontière nette : le worker écrit, le backend (API tRPC) ne fait que lire
  les interventions publiées.
- Tout ce qui touche au réseau externe est testable hors ligne, avec des
  fixtures enregistrées.

**Non-Goals :**
- Interface d'administration : Drizzle Studio et les scripts suffisent.
- Haute disponibilité du worker : une instance, avec un verrou contre les
  exécutions concurrentes.

## Decisions

### D1 — Modules
Frontière lecture/écriture : ADR 0017.

```
packages/db/            @lisnard/db : schéma Drizzle, migrations SQL, client Bun.sql
apps/worker/            @lisnard/worker
  src/index.ts          démarrage : migrations, puis boucle de planification
  src/scheduler.ts      cadences par type de source + advisory lock Postgres
  src/sources/          un adaptateur par type : youtube.ts, rss.ts (interface Source)
  src/sources.config.ts liste des sources (identifiant, type, média, actif)
  src/collect.ts        pré-filtre, seuil d'historique, dédoublonnage, upsert
  src/classifier/       client System One, questions, seuils, décision
  src/media/            résolution oEmbed / Open Graph
  src/publish.ts        application de la règle de publication
  src/cli.ts            commandes : reclassify, recompute, calibrate
  eval/reference.jsonl  jeu de référence étiqueté
packages/api/           + routers/interventions.ts (lecture seule)
apps/app/               accueil, écran /interventions/[id]
```

Le backend dépend de `@lisnard/db` en **lecture**. Seul le worker importe les
fonctions d'écriture : `@lisnard/db` exporte deux points d'entrée, `read` et
`write`, pour rendre cette frontière visible dans les imports.

### D2 — Schéma de données

```
source          id (texte, ex. "yt:bfmtv"), kind, name (média), active
item            id (uuid), source_id, platform_id (unique, ex. "yt:dQw4…"),
                url, title, description, published_at, starts_at, ends_at,
                live_status (none|upcoming|live|ended), thumbnail_url,
                status (pending|published|rejected), role, kind,
                media (jsonb : {kind:"embed", provider, embedUrl} | {kind:"link", og}),
                first_seen_at, updated_at
classification  id, item_id, model, questions_version, input_hash,
                answers (jsonb : probabilités brutes par question),
                thresholds (jsonb), outcome (published|rejected), created_at
```

- **Identité d'un contenu** : `platform_id` est unique (identifiant de vidéo
  YouTube, sinon hash de l'URL canonique). Un contenu trouvé par deux sources
  ne crée qu'une ligne : la première source est conservée.
- **Journal** : `classification` est en ajout seul. `item.status`, `role` et
  `kind` sont dénormalisés à partir de la dernière décision, pour que la
  lecture côté backend reste simple et indexée (index sur
  `(status, live_status, starts_at)` et `(status, role, published_at)`).
- **Date de tri** : `coalesce(starts_at, published_at)`.

### D3 — Sources
Stratégie YouTube : ADR 0017. Rattrapage des chaînes officielles par leur
playlist « uploads » : ADR 0018.

- **YouTube** : flux RSS public
  `https://www.youtube.com/feeds/videos.xml?channel_id=<id>`, gratuit et sans
  quota (15 dernières vidéos), puis `videos.list`
  (`part=snippet,liveStreamingDetails`, 1 unité de quota, jusqu'à 50
  identifiants par appel) pour la description complète et le statut de
  diffusion. Les contenus `upcoming` et `live` sont revérifiés à chaque cycle
  par `videos.list`.
- **RSS générique** : podcasts et Google News RSS (requête sur « David
  Lisnard », langue `fr`). Un même adaptateur, avec un parseur XML.
- **Cadences** : YouTube toutes les 3 minutes, RSS toutes les 15 minutes,
  revérification des directs à chaque cycle YouTube.
- **Sources initiales** (identifiants vérifiés le 2026-10-13) : chaîne
  **@david_lisnard**, liée depuis le site du parti (`@davidlisnard` est
  inactive depuis 2017) ; chaînes de BFMTV, CNEWS (`@cnewsofficiel`),
  franceinfo, LCI, Public Sénat, LCP, Sud Radio, RTL, Europe 1, France Inter,
  Le Figaro et Le Parisien ; Google News. Première collecte réelle : 14 sources,
  294 contenus, 110 retenus, 13 unités de quota.
- **Quota** : environ 13 chaînes × 1 unité × 480 cycles par jour, soit environ
  6 000 unités, sous les 10 000 unités quotidiennes de l'API. Le compteur est
  journalisé.

### D4 — Classifieur
Modèle, questions et seuils : ADR 0004. Règle de publication (dont l'exception de
la chaîne officielle) : ADR 0018, qui remplace l'ADR 0005.

- **Client** : client REST minimal, sans SDK, sur
  `POST https://openrouter.ai/api/v1/systemone` (`Authorization: Bearer`). Le
  reste du worker ne voit que l'interface `Classifier`.
- **Résultat du spike (tâche 1)** :
  - Requête : `{ model, state (chaîne), questions: { <clé>: { type: "noul" | "choice",
    instructions, criteria? } } }`.
  - Réponse : `answers.<clé>` vaut `{ type: "noul", noul }` ou
    `{ type: "choice", choice, probabilities, confidence }`, avec en plus
    `model` (instantané servi, ex. `typesafe/jev-1.13-20260917`) et
    `usage.cost`.
  - 20 cas en français, couvrant tous les cas limites de l'ADR 0006 :
    **20/20 décisions de publication correctes**. Rôle correct dans tous les
    cas, et séparation nette de la probabilité « intervient » : les vraies
    interventions nationales ou AMF sont à 0,57 ou plus, les simples citations
    à 0,17 ou moins.
  - Latence de 230 à 510 ms, environ 0,00003 $ par appel (3 questions).
- **Modèle épinglé sur l'instantané daté** `typesafe/jev-1.13-20260917`.
  L'identifiant `typesafe/jev-1.13` pointe sur le dernier instantané 1.13, ce
  qui pourrait décaler la calibration. Le `model` renvoyé est journalisé.
- **État envoyé** : JSON `{ title, description (tronquée à 2 000 caractères),
  outlet, sourceKind, publishedAt, startsAt }`.
- **Questions** (`QUESTIONS_VERSION = 1`) :
  - Noul : « David Lisnard s'exprime lui-même dans ce contenu (interview,
    discours, prise de parole), il n'est pas seulement cité » ;
  - Choice `role` : `national | amf | mairie | hors_sujet`, avec des
    descriptions qui tranchent les cas limites de l'ADR 0006 ;
  - Choice `kind` : les 8 types de la spec.
- **Seuils** : `thresholds.ts`, indexés par identifiant de modèle. Valeurs
  initiales tirées du spike (`τ_intervient = 0.50`, `τ_role = 0.60`). Avec
  0,85, une matinale BFMTV (0,79) et un discours au congrès de l'AMF (0,74)
  auraient été écartés. Elles seront confirmées ou ajustées par la calibration
  (tâche 5) avant la mise en production.
  *Résultat de la calibration (2026-10-13)* : `τ_intervient = 0.75`,
  `τ_role = 0.60` avec les questions v2, soit 98 % de précision et 82,8 % de
  rappel sur 120 cas validés. Voir `docs/architecture/classifier.md`.
- **Reprise sur erreur** : 3 tentatives avec attente exponentielle par cycle ;
  au-delà, l'élément reste `pending` (spec « Indisponibilité du classifieur »).
- **Cache** : `input_hash` (hash de l'état et de la version des questions). Si
  l'entrée n'a pas changé depuis la dernière classification, on n'appelle pas
  le classifieur. Un changement de titre ou de description entraîne une
  reclassification.

### D5 — Calibration et jeu de référence

- `eval/reference.jsonl` contient environ 100 contenus réels collectés, avec
  les étiquettes attendues (intervient, rôle, type) et **tous les cas limites
  de l'ADR 0006**. Les étiquettes sont proposées par l'agent puis **validées
  par le porteur du projet** (tâche explicite).
- `bun run worker calibrate` classe le jeu de référence et affiche précision et
  rappel pour une grille de seuils. Il propose les seuils qui maximisent la
  précision (une fausse publication coûte plus cher qu'un oubli, ADR 0005)
  sous la contrainte d'un rappel d'au moins 80 %.

### D6 — Médias
Lecture d'URL externes et oEmbed : ADR 0017.

- **oEmbed** : liste blanche de fournisseurs (YouTube, Dailymotion) avec leurs
  endpoints. On ne garde que l'`embedUrl` (attribut `src` de l'iframe
  renvoyée), après vérification que son hôte appartient au fournisseur. Le HTML
  brut n'est jamais conservé (spec « Intégration sécurisée »).
- **Open Graph** : lecture de la page avec une limite de taille (1 Mo) et un
  délai de 5 s. Seules les URL issues des sources configurées sont lues, et
  seulement en `http(s)`, avec refus des adresses IP privées (protection
  SSRF).
- **Affichage** : sur le web, un `<iframe>` avec `sandbox="allow-scripts
  allow-same-origin allow-presentation"` et `allow="fullscreen"`. Sur mobile,
  `react-native-webview` charge l'`embedUrl`, avec une navigation limitée à
  l'hôte du fournisseur. Ce module natif fait partie du SDK Expo et fonctionne
  dans Expo Go.

### D7 — API et interface

- `interventions.list` : entrée zod `{ status, role?, cursor?, limit ≤ 50 }`.
  Curseur opaque `(date, id)`. Le statut temporel est calculé côté backend au
  moment de la requête (spec « Statut temporel »).
- `interventions.byId` : renvoie `NOT_FOUND` si l'intervention est absente ou
  non publiée.
- **Accueil** : `useQuery` pour `live` et `upcoming` avec
  `refetchInterval: 60_000`, `useInfiniteQuery` pour `past`. Le filtre de rôle
  est un sélecteur segmenté en tête de liste.
- **Détail** : route `src/app/interventions/[id].tsx`, rendu côté client
  (ADR 0011), `PageHead` avec un titre générique tant que les données ne sont
  pas chargées, puis le titre de l'intervention.
- **Composants** : `InterventionCard`, `LiveBadge` (émeraude), `MediaEmbed`
  (`.web.tsx` pour l'iframe, `.tsx` pour la WebView) et `LinkCard`.

### D8 — Déploiement et environnements
Voir ADR 0014 et 0015.

- **`apps/app/Dockerfile`** : construction multi-étapes. `bun install`, puis
  `expo export -p web`, puis une image d'exécution Bun qui sert `dist/` via
  `expo-server/adapter/bun` (script `apps/app/server.ts`).
- **`apps/worker/Dockerfile`** : image Bun qui exécute
  `apps/worker/src/index.ts`. Les migrations Drizzle sont appliquées au
  démarrage (ADR 0015).
- **Healthchecks** : `GET /api/trpc/health` pour l'app. Pour le worker, un
  fichier de pulsation (horodatage du dernier cycle) vérifié par le
  healthcheck Docker.
- **Devcontainer** : passage à docker compose avec un service `postgres`
  (même version majeure qu'en production). Le pare-feu gagne
  `www.youtube.com`, `www.googleapis.com` (API YouTube Data), `news.google.com`, les
  endpoints oEmbed et les hôtes des flux RSS configurés.
- **CI** : service Postgres dans le job. Les tests d'intégration de `@lisnard/db`
  et du worker utilisent une base jetable, migrée au démarrage du test.

### D9 — Tests

- Fixtures enregistrées (`__fixtures__/`) : flux RSS YouTube, réponses
  `videos.list`, flux Google News, réponses oEmbed et pages HTML avec Open
  Graph. Aucun appel réseau dans les tests.
- Le classifieur est doublé par une implémentation de l'interface `Classifier`
  qui renvoie des probabilités choisies, pour tester la règle de publication et
  ses cas limites.
- Tests d'intégration sur Postgres : dédoublonnage, upsert, journal en ajout
  seul, recalcul des seuils, et `interventions.list` / `byId` (filtres, tri,
  pagination, exclusion des contenus non publiés).
- Le smoke test web vérifie `/interventions/<id>` (200) et l'accueil, sur une
  base contenant des fixtures.

## Risks / Trade-offs

- **[API Jev non documentée]** Le format de `/api/v1/systemone` n'est pas
  publié. → Le spike (tâche 1) le confirme avant toute autre tâche du
  classifieur. S'il échoue, l'interface `Classifier` permet de basculer sur un
  LLM classique en sortie structurée, ce qui demanderait un ADR remplaçant
  l'ADR 0004.
- **[Calibration sur du français]** Les probabilités peuvent être mal
  calibrées sur ce domaine. → Jeu de référence, précision privilégiée, et
  publication bloquée tant qu'aucun seuil n'est défini pour le modèle (spec).
- **[Profondeur des flux RSS]** Les flux YouTube n'exposent que 15 vidéos, d'où
  un rattrapage limité depuis le 31 mars. → Accepté (ADR 0016) ; un rattrapage
  par `search.list` coûte 100 unités par appel et fera l'objet d'un change à
  part.
- **[Quota YouTube]** Environ 6 000 unités par jour sur 10 000. → Cadence
  configurable et compteur journalisé ; on peut réduire la fréquence des
  chaînes peu actives.
- **[Google News]** Ses liens (`news.google.com/rss/articles/…`) ne se
  résolvent pas par simple redirection HTTP : il faut du JavaScript côté
  navigateur. → *Mise à jour à l'implémentation* : on garde l'URL Google News
  (elle redirige dans le navigateur), on dédoublonne par `guid` et on lit le
  média réel dans `<source>` (colonne `item.outlet`). Le rendu est un `link`
  minimal. Le classifieur filtre les nombreux articles qui ne font que citer
  David Lisnard.
- **[Pare-feu du devcontainer et Open Graph]** La lecture d'Open Graph vise
  des domaines arbitraires, bloqués dans le devcontainer. → En développement,
  on s'appuie sur les fixtures, et l'échec donne un `link` minimal (spec). Le
  comportement complet est vérifié en CI et en production.
- **[SSRF]** Le worker lit des URL externes. → Uniquement `http(s)`, refus des
  IP privées et de la boucle locale après résolution DNS, limites de taille et
  de délai.

## Migration Plan

Premier schéma, donc pas de migration de données. Ordre de mise en production :
Postgres sur Coolify, puis worker (migrations, collecte et classification en
mode « publication bloquée » tant que la calibration n'est pas faite), puis app.
Retour arrière : arrêter le worker, l'app continue d'afficher les dernières
interventions publiées.

## Open Questions

- Liste définitive des flux RSS de podcasts radio : à arrêter pendant
  l'implémentation selon ce que les diffuseurs exposent. Ça ne change ni les
  specs ni l'approche (adaptateur RSS générique).
