## Context

Motivation : voir `proposal.md`. Les décisions durables (Gemini via OpenRouter,
refus de résumer la presse, lecture limitée aux métadonnées de partage) sont
dans l'ADR 0021.

État actuel :
- le worker enchaîne collecte, classification (Jev) et rendu média
  (`media/resolve.ts`) ;
- un contenu Google News est rendu en `link` minimal, car `news.google.com` est
  dans `NO_OPEN_GRAPH` ;
- la lecture d'URL externes passe par `safeFetchText` (ADR 0017).

Essais du 2026-10-13 (scripts jetables, non commités) :
- **Résumé** : `google/gemini-3.5-flash-lite` via OpenRouter résume une URL
  YouTube en 4,7 s (clip, 0,002 $) ou en 35 s (débat, 0,10 $) ;
- **Liens Google News** : 8 articles décodés sur 8 par `batchexecute`, 7 pages
  d'éditeur sur 8 fournissent `og:image` et `og:description` (un éditeur a
  répondu 429) ;
- **Identité HTTP** : lejdd.fr refuse l'identité de curl, mais accepte une
  identité de navigateur explicite.

## Goals / Non-Goals

**Goals :**
- Produire et afficher un résumé fiable des vidéos publiées, à coût borné et
  sans bloquer la publication.
- Remplir la carte des articles avec les métadonnées de l'éditeur et faire
  pointer le lien vers lui.

**Non-Goals :**
- Transcription, résumé dans les cartes de la liste, résumé de la presse (voir
  « Hors périmètre » de la proposition).
- Évaluation automatique de la qualité des résumés : relecture manuelle d'un
  échantillon, voir D7.

## Decisions

### D1 — Stockage : colonnes sur `item`, sans journal

- `item.summary jsonb` contient soit `{ kind: 'ok', text, points[], model,
  promptVersion, generatedAt, cost }`, soit `{ kind: 'none', reason:
  'not_speaking' | 'failed' | 'too_long', model, promptVersion, generatedAt,
  cost }`. `kind: 'none'` évite de
  redemander le même résumé.
- `item.summary_attempts int NOT NULL DEFAULT 0` compte les échecs
  consécutifs ; il est remis à 0 après un succès.

Seul le dernier résumé fait foi : aucune décision n'en dépend, donc un journal
en ajout seul comme pour Jev (ADR 0018) n'apporterait rien.

**Lecture publique** : `getPublishedById` n'expose que `{ text, points }`, et
seulement si `kind = 'ok'`.

*Alternative écartée* : une table `summary`. Une jointure de plus pour une
relation 1:1, sans historique utile.

### D2 — Sélection des contenus à résumer

La requête `listSummaryTargets(db, limit, promptVersion)` sélectionne les
contenus :
- `status = 'published'` ;
- `media->>'provider' = 'youtube'` ;
- `live_status in ('none', 'ended')` ;
- `summary_attempts < 3` ;
- sans résumé, ou dont le résumé porte une autre `promptVersion`.

Ils sont triés du plus récent au plus ancien : les nouveautés passent avant le
rattrapage.

### D3 — Client OpenRouter et sortie structurée

- **Requête** : `POST /api/v1/chat/completions` avec :
  - le modèle épinglé `SUMMARY_MODEL` (« lite »), ou `SUMMARY_MODEL_LONG`
    (Flash) pour une vidéo de plus de 20 minutes ou de durée inconnue : en v2,
    le modèle « lite » restait trop général sur un débat d'une heure ;
  - `provider: { only: ['google-ai-studio'] }` (URL YouTube, ADR 0021) ;
  - `response_format: json_schema` pour `{ speaks: boolean, summary: string,
    points: string[] }` ;
  - `usage: { include: true }` pour journaliser le coût.
- **Validation** : la réponse est validée par `parseSummaryOutput`, sur le modèle de `parseAnswers` (le worker ne dépend pas de zod). Une forme invalide compte
  comme un échec (D5).
- **Consigne** : `summaries/prompt.ts`, avec `PROMPT_VERSION = 1`. Le texte
  reprend la spec `intervention-summaries` : longueur proportionnée à la durée, attribution,
  neutralité, pas de citation de plus de 15 mots, rien qui ne soit dans la
  vidéo.
- **Contexte** : le titre et le média sont fournis au modèle pour l'aider à
  identifier David Lisnard.

Le client suit le modèle du classifieur : injection de `fetch` et classe
`Summarizer` pour les tests, comme `Classifier`.

### D4 — Tâche planifiée et budget

- **Tâche `summarize`** : toutes les 2 minutes, 5 contenus au plus par cycle,
  traités en série (une vidéo longue prend environ 35 s).
- **Budget** : `SUMMARY_DAILY_BUDGET_USD` (par défaut 1 $) borne la somme des
  coûts des résumés produits depuis minuit, heure de Paris. Le cumul est
  calculé en base (`summaryCostSince`, sur `item.summary->>'cost'` et
  `generatedAt`) : il survit aux redémarrages.
- **Rattrapage** : avec 1 $ par jour, celui des quelque 200 vidéos existantes
  prend plusieurs jours. Une commande `bun cli.js summarize --budget 5` permet de
  le faire en une fois, à la demande.

### D5 — Échecs

Une erreur réseau, un HTTP 4xx (hors 402 et 429) ou une réponse invalide
incrémentent `summary_attempts`. Un HTTP 402 (crédit épuisé), 429 ou 5xx lève
`SummaryServiceUnavailable` : le cycle s'arrête sans rien décompter. Ce cas a
été ajouté après qu'un crédit épuisé a fait abandonner 96 vidéos en un seul
passage. Au troisième échec, `summary = { kind: 'none', reason:
'failed' }`. Une nouvelle `promptVersion` ou une commande `summarize --retry`
remet les compteurs à zéro.

### D6 — Liens Google News

- `media/google-news.ts` décode le lien en deux appels :
  1. lecture de la page de l'article Google News, d'où sont extraits
     `data-n-a-sg` et `data-n-a-ts` ;
  2. appel `POST /_/DotsSplashUi/data/batchexecute` (`Fbv4je`), dont la réponse
     donne l'URL de l'éditeur.

  Les deux appels passent par `safeFetchText`, avec une méthode POST ajoutée.
  L'URL obtenue doit être en `https` et hors des domaines Google.
- **Lecture de la page de l'éditeur** : `tryOpenGraph` la lit avec un
  `User-Agent` explicite (`Mozilla/5.0 (compatible; LisnardPlay/1.0;
  +<site>)`), coupe le corps à `</head>` comme aujourd'hui et ne conserve que les
  balises Open Graph. Aucune lecture du corps de l'article n'a lieu (ADR 0021).
- **Rendu** : `MediaRender` de type `link` gagne `url?: string`, l'URL de
  l'éditeur. L'app l'utilise pour la carte, à la place de `item.url`.
  `news.google.com` sort de `NO_OPEN_GRAPH`, au profit de ce décodage.
- **Reprise** : `bun cli.js media --refresh [--source rss:google-news]`
  recalcule le rendu des contenus publiés de la source.

### D7 — Vérification de la qualité

Avant l'archivage, un échantillon d'une dizaine de résumés (clips, débats,
vidéos de médias) est présenté au porteur du projet. Il vérifie la fidélité, la
neutralité et l'absence d'invention. Une correction de consigne incrémente
`PROMPT_VERSION`.

### D8 — Interface

Sur l'écran de détail, juste sous le lecteur et avant la description (le porteur
du projet a préféré voir la vidéo d'abord) :
- un encadré « Résumé », avec le texte, les points clés en liste et la mention
  « Résumé généré automatiquement » en petit ;
- les tokens de la charte (fond `bg-blanc/5`, bordure, titre de section
  chamois), skill `charte-ui` ;
- rien si `summary` vaut `null`.

## Risks / Trade-offs

- **[Résumé infidèle ou partial]** : un texte généré présenté au nom d'un
  candidat. → Consigne stricte, mention visible, échantillon validé (D7) ; le
  lecteur reste juste en dessous pour vérifier.
- **[Rupture du décodage Google News]** : point d'accès non documenté. →
  Repli sur le lien minimal, comportement actuel. Les tests sur des réponses
  enregistrées détectent un changement de format ; une alerte apparaît dans le
  journal si le taux d'échec dépasse 50 % sur un cycle.
- **[Coût d'une vidéo très longue]** (meeting de 2 h, environ 0,40 $). → Le
  plafond quotidien absorbe ces cas ; les vidéos de plus de 3 h sont ignorées
  (`kind: 'none', reason: 'too_long'`). La durée est connue par `videos.list`,
  déjà appelé à la collecte, et stockée sur `item.duration_s`, ajoutée à la
  migration.
- **[Disponibilité du modèle]** : un modèle Gemini peut être retiré
  d'OpenRouter. → Il est épinglé ; tout changement passe par une nouvelle
  `PROMPT_VERSION` et une note dans la doc.

## Migration Plan

1. Merger dans l'ordre : `intervention-ingestion` (#5, #6), puis
   `campaign-themes` (#7), puis ce change. Archiver chaque change avant le
   suivant.
2. Au déploiement, la migration ajoute `summary`, `summary_attempts` et
   `duration_s`. Le worker commence à résumer dans la limite du budget.
3. Lancer `bun cli.js media --refresh --source rss:google-news` pour reprendre
   les articles existants, puis, si souhaité, `bun cli.js summarize --budget 5`
   pour le rattrapage des vidéos.

**Retour arrière** : redéployer l'image précédente. Les colonnes, additives,
restent en place, et l'ancienne app ignore `summary`.
