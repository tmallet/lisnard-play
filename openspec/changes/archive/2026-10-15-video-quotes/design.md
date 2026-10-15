## Context

Motivation : `proposal.md`. Décision durable : ADR 0028 (citations extraites par
Gemini avec le résumé, recherche plein texte dans Postgres, page par citation
adressée par son minutage). On s'appuie sur les résumés (ADR 0021 : Gemini via
OpenRouter, vidéo passée par `video_url`, plafond quotidien), le consentement aux
lecteurs tiers (ADR 0022) et la frontière d'écriture (ADR 0017).

## Decisions

### D1 — Extraction (worker, consigne v4)

- **Consigne** : le schéma `SUMMARY_SCHEMA` reçoit `quotes`, un tableau de 3 à 8
  objets `{ text, start, theme }`.
  - `text` : ses mots tels qu'il les prononce, 40 mots au plus, sans reformulation.
  - `start` : le moment où la phrase commence, au format `MM:SS` ou `H:MM:SS`.
    Gemini donne les minutages sous ce format pour une vidéo.
  - `theme` : un des sept slugs (ADR 0020) ou `none`.
  - Si `speaks` vaut faux, le tableau est vide.
- **Validation** (`parseSummaryOutput`) : minutage converti en secondes et borné par la
  durée connue de la vidéo. Doublons et textes vides écartés ; au plus 8 citations.
  Une citation invalide est ignorée, sans rendre le résumé invalide.
- **`PROMPT_VERSION` = 4** : les résumés existants sont régénérés par la tâche
  `summarize` au fil du plafond quotidien. Environ 200 vidéos, autour de 5 $ ; la
  commande `summarize --budget 6` les traite d'un coup.

### D2 — Données

```
quote
  id uuid pk
  item_id uuid → item (cascade)
  position int                -- ordre dans la vidéo
  text text
  search text                 -- texte normalisé : minuscules, sans accents
  start_s int
  theme text null
  created_at
  unique (item_id, start_s)
```

- **Index** : GIN sur `to_tsvector('french', search)` pour la recherche, et
  `(item_id, position)`.
- **Titres et résumés** : un index GIN d'expression sur `item`,
  `to_tsvector('french', <titre et résumé normalisés>)`. La normalisation (sans
  accents) est faite en SQL par une fonction immuable `lp_normalize`, avec
  `translate` vers les lettres sans accent. On évite ainsi l'extension `unaccent`,
  dont l'installation exige des droits élevés sur certains hébergements.
- **Écriture** : `recordSummary` remplace les citations de l'intervention dans la même
  transaction (suppression puis insertion). Le minutage étant unique par
  intervention, deux citations au même instant sont fusionnées.

### D3 — API

- **`interventions.byId`** : ajoute `quotes: [{ text, startS, theme }]`, triées par
  minutage.
- **`quotes.at({ id, t })`** : la citation de l'intervention à ce minutage, à 5
  secondes près, et le résumé de l'intervention. `null` si aucune ne correspond.
- **`search.query({ q })`**, avec `q` de 2 à 100 caractères :
  - la requête est normalisée puis passée à `websearch_to_tsquery('french', …)` ;
  - résultat : `{ quotes: [...] (20 au plus, classées par pertinence),
    interventions: [...] (20 au plus) }` ;
  - seules les interventions publiées, visibles et non reprises sont concernées ;
  - un cache d'une minute par requête normalisée est conservé.

### D4 — Lecteur calé sur un moment

- `playerUrl(embedUrl, startS)` ajoute `start=<secondes>` à l'URL du lecteur YouTube
  sans cookie, qui démarre aussitôt après le consentement (ADR 0022).
- L'écran de détail lit `?t=` et le passe au lecteur.
- Le bouton « ▶ 12:34 » d'une citation met à jour `t`, ce qui relance le lecteur au
  moment voulu, et remonte la page jusqu'au lecteur.

### D5 — Écrans

- **Détail** : section « Citations » sous le résumé. Chaque citation est un bloc
  guillemeté en Montserrat, avec le bouton du minutage et un lien « Partager »
  (copie ou partage natif de l'adresse de la page de la citation). Elle porte la
  mention « Transcription automatique — écoutez le passage pour vérifier ».
- **Page d'une citation** : `src/app/interventions/[id]/citation/[t].tsx`, avec la
  citation en grand (titre de la page web), le média et la date, le lecteur calé sur
  le passage et un lien vers l'intervention complète. Sans citation correspondante,
  elle redirige vers `/interventions/<id>?t=<t>`.
- **Recherche** : un champ d'une ligne au-dessus des filtres de l'accueil. La
  validation remplace le flux par les résultats, avec « Effacer » pour revenir au
  flux. L'adresse porte `?q=` sur le web, pour pouvoir partager une recherche.
  - Citations : texte, média, date, thème, menant à leur page.
  - Interventions : les cartes habituelles.

## Risks / Trade-offs

- **[Minutages imprécis]** : on vérifie un échantillon de citations (minutage et mots)
  avant de merger. Le bouton lance le lecteur 2 secondes avant le minutage indiqué,
  pour ne pas couper le début de la phrase.
- **[Mots inexacts]** : la mention « transcription automatique » et l'invitation à
  écouter le passage limitent le risque. La consigne interdit de reformuler.
- **[Coût de régénération]** : environ 5 $ une fois, étalés sur quelques jours au
  plafond par défaut.
- **[Liens vers une citation qui a changé]** : repli sur l'intervention au même
  moment (D5).
