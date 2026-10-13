## 1. Données

- [x] 1.1 Colonnes `item.summary` (jsonb), `item.summary_attempts` et `item.duration_s` ; types `SummaryRecord` dans `schema.ts` ; migration générée (D1, D4)
- [x] 1.2 `write.ts` : `listSummaryTargets`, `recordSummary`, `recordSummaryFailure`, `summaryCostSince` ; `upsertItem` enregistre la durée transmise par la collecte YouTube
- [x] 1.3 `read.ts` : `getPublishedById` expose `summary` (`{ text, points }` ou `null`) ; `MediaRender` de type `link` porte `url?` ; tests de `db.test.ts`

## 2. Collecte

- [x] 2.1 `sources/youtube.ts` : lecture de `contentDetails.duration` (ISO 8601) dans `videos.list`, transmise comme `durationS` ; test sur les réponses enregistrées

## 3. Résumés

- [x] 3.1 `summaries/prompt.ts` : consigne et `PROMPT_VERSION = 1`, conformes à la spec `intervention-summaries` ; schéma JSON de sortie
- [x] 3.2 `summaries/openrouter.ts` : client (`SUMMARY_MODEL` épinglé, fournisseur Google AI Studio, `response_format`, coût), validation de la sortie (comme `parseAnswers`), `fetch` injectable
- [x] 3.3 `summaries/task.ts` : sélection, budget quotidien (`SUMMARY_DAILY_BUDGET_USD`), plafond par cycle, vidéos trop longues ignorées, échecs et plafond de tentatives (D2, D4, D5)
- [x] 3.4 Tâche `summarize` dans le planificateur (2 min) ; CLI `summarize [--budget N] [--retry]`
- [x] 3.5 Tests : contenus éligibles ou non (direct, article, Dailymotion), « ne s'exprime pas », échecs puis abandon, budget atteint, nouvelle `PROMPT_VERSION`

## 4. Liens d'agrégateur

- [x] 4.1 `safeFetchText` : méthode POST, corps et `User-Agent` explicite (ADR 0017)
- [x] 4.2 `media/google-news.ts` : décodage en deux appels, URL obtenue validée (`https`, hors Google) ; tests sur des réponses enregistrées, cas d'échec
- [x] 4.3 `resolveMedia` : décodage, puis Open Graph de l'éditeur, puis `link` avec `url` ; repli sur le lien minimal ; `news.google.com` retiré de `NO_OPEN_GRAPH`
- [x] 4.4 CLI `media --refresh [--source <id>]` ; test

## 5. API et app

- [x] 5.1 `interventions.byId` : `summary` dans la réponse ; test (présent, `null`, aucune donnée interne)
- [x] 5.2 Composant `SummaryBlock` sur l'écran de détail, juste sous le lecteur, mention « Résumé généré automatiquement » (D8, skill `charte-ui`)
- [x] 5.3 `LinkCard` et écran de détail : lien vers `media.url` quand il existe
- [x] 5.4 Tests : bloc présent ou absent, lien vers l'éditeur

## 6. Validation

- [ ] 6.1 En local : `media --refresh` sur Google News, puis `summarize --budget 2` ; vérifier le web et le simulateur iOS
- [ ] 6.2 Échantillon d'environ 10 résumés présenté au porteur du projet ; ajuster la consigne si besoin (D7)
- [x] 6.3 Smoke test : `byId` renvoie un résumé sur l'intervention de test ; `bun run check` et `bun run smoke:web` au vert

## 7. Documentation

- [x] 7.1 `docs/architecture/resumes.md` : modèle, consigne, garde-fous, coûts, procédure de changement de modèle ou de consigne ; lien depuis `docs/architecture/README.md` (schéma, cycle du worker)
- [x] 7.2 `docs/architecture/commandes.md` (`summarize`, `media --refresh`), `deploiement.md` (étapes de reprise, `SUMMARY_DAILY_BUDGET_USD`) et `.env.example`
- [x] 7.3 `apps/worker/AGENTS.md` (module `summaries/`), `packages/db/AGENTS.md`, `apps/app/AGENTS.md`, `AGENTS.md` racine (état)
- [x] 7.4 ADR 0021 déjà rédigé ; consigner tout écart avec le skill `record-decision`
