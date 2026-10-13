# Résumés des vidéos

Résumé court, sous le lecteur de l'écran de détail, de ce que dit David Lisnard dans
une vidéo (ADR 0021, spec `intervention-summaries`). Code :
`apps/worker/src/summaries/`.

## Modèle

- **Gemini** via OpenRouter (`POST /api/v1/chat/completions`), modèle épinglé
  `google/gemini-3.5-flash-lite` (`SUMMARY_MODEL`).
- **Fournisseur imposé** : Google AI Studio (`provider.only`), le seul qui
  accepte les URL YouTube. La vidéo est passée par URL (contenu `video_url`) :
  elle n'est jamais téléchargée (ADR 0007).
- **Sortie structurée** (`response_format: json_schema`) :
  `{ speaks, summary, points }`, validée par `parseSummaryOutput`.
- **Clé** : `OPENROUTER_API_KEY`, la même que pour Jev, réservée au worker.

## Consigne (`prompt.ts`, version 1)

- Français, factuel, neutre, trois phrases au plus, propos attribués (« Il
  estime que… »).
- Deux à quatre points clés de quelques mots.
- Ni opinion, ni citation de plus de quinze mots, ni information absente de la
  vidéo.
- `speaks: false` si David Lisnard ne s'exprime pas : rien n'est affiché.

Toute modification du texte ou du schéma incrémente `PROMPT_VERSION`. Les
résumés existants sont alors régénérés au fil des cycles, les plus récents
d'abord.

## Sélection et garde-fous

| Règle | Valeur |
|-------|--------|
| Contenus | publiés, rendu `embed` YouTube, diffusion terminée (`live_status` `none` ou `ended`) |
| Cadence | tâche `summarize` toutes les 2 min, 5 vidéos au plus par cycle |
| Plafond quotidien | `SUMMARY_DAILY_BUDGET_USD` (1 $ par défaut), calculé en base depuis minuit, heure de Paris |
| Vidéos trop longues | plus de 3 h : `kind: 'none', reason: 'too_long'`, sans appel |
| Échecs | 3 tentatives, puis `reason: 'failed'` pour la version courante de la consigne |

**Stockage** : `item.summary` (jsonb) contient le texte et les points, ou le
motif d'absence, avec le modèle, la version de la consigne, la date et le coût.
L'API n'expose que `{ text, points }`, et seulement si `kind = 'ok'`.

## Coûts observés (2026-10-13)

| Vidéo | Durée de traitement | Coût |
|-------|---------------------|------|
| Clip de la chaîne officielle | 4,7 s | 0,002 $ |
| Débat complet | 35 s | 0,10 $ |

## Articles de presse

Ils ne reçoivent aucun résumé, à cause du droit voisin des éditeurs
(ADR 0021).
- **Liens Google News** : ils sont décodés vers l'URL de l'éditeur
  (`media/google-news.ts`, point d'accès `batchexecute`).
- **Page de l'éditeur** : seule la partie avant `</head>` est lue
  (`headOnly`), pour en tirer l'image, l'accroche (300 caractères au plus,
  nettoyée de son HTML) et le nom du site.
- **Lien « source »** : la carte ouvre l'article chez l'éditeur (`media.url`).
- **Échec du décodage** : lien minimal, comme avant.

## Procédures

| Besoin | Commande (depuis la racine) |
|--------|-----------------------------|
| Rattraper les vidéos sans résumé, au-delà du plafond par défaut | `bun apps/worker/src/cli.ts summarize --budget 5` |
| Relancer les résumés abandonnés après des échecs | `bun apps/worker/src/cli.ts summarize --retry` |
| Reprendre les cartes des articles Google News | `bun apps/worker/src/cli.ts media --refresh --source rss:google-news` |

**Changer de modèle** :
1. vérifier sur OpenRouter qu'il accepte les vidéos YouTube via Google AI
   Studio ;
2. modifier `SUMMARY_MODEL` et incrémenter `PROMPT_VERSION` pour régénérer ;
3. faire relire un échantillon au porteur du projet ;
4. consigner le changement (skill `record-decision`).
