## 1. Données

- [ ] 1.1 Colonnes `item.summary` (jsonb), `item.summary_attempts` et `item.duration_s` ; types `SummaryRecord` dans `schema.ts` ; migration générée (D1, D4)
- [ ] 1.2 `write.ts` : `listSummaryTargets`, `recordSummary`, `recordSummaryFailure`, `summaryCostSince` ; `upsertItem` enregistre la durée transmise par la collecte YouTube
- [ ] 1.3 `read.ts` : `getPublishedById` expose `summary` (`{ text, points }` ou `null`) ; `MediaRender` de type `link` porte `url?` ; tests de `db.test.ts`

## 2. Collecte

- [ ] 2.1 `sources/youtube.ts` : lecture de `contentDetails.duration` (ISO 8601) dans `videos.list`, transmise comme `durationS` ; test sur les réponses enregistrées

## 3. Résumés

- [ ] 3.1 `summaries/prompt.ts` : consigne et `PROMPT_VERSION = 1`, conformes à la spec `intervention-summaries` ; schéma JSON de sortie
- [ ] 3.2 `summaries/openrouter.ts` : client (`SUMMARY_MODEL` épinglé, fournisseur Google AI Studio, `response_format`, coût), validation zod, `fetch` injectable
- [ ] 3.3 `summaries/task.ts` : sélection, budget quotidien (`SUMMARY_DAILY_BUDGET_USD`), plafond par cycle, vidéos trop longues ignorées, échecs et plafond de tentatives (D2, D4, D5)
- [ ] 3.4 Tâche `summarize` dans le planificateur (2 min) ; CLI `summarize [--budget N] [--retry]`
- [ ] 3.5 Tests : contenus éligibles ou non (direct, article, Dailymotion), « ne s'exprime pas », échecs puis abandon, budget atteint, nouvelle `PROMPT_VERSION`

## 4. Liens d'agrégateur

- [ ] 4.1 `safeFetchText` : méthode POST, corps et `User-Agent` explicite (ADR 0017)
- [ ] 4.2 `media/google-news.ts` : décodage en deux appels, URL obtenue validée (`https`, hors Google) ; tests sur des réponses enregistrées, cas d'échec
- [ ] 4.3 `resolveMedia` : décodage, puis Open Graph de l'éditeur, puis `link` avec `url` ; repli sur le lien minimal ; `news.google.com` retiré de `NO_OPEN_GRAPH`
- [ ] 4.4 CLI `media --refresh [--source <id>]` ; test

## 5. API et app

- [ ] 5.1 `interventions.byId` : `summary` dans la réponse ; test (présent, `null`, aucune donnée interne)
- [ ] 5.2 Composant `SummaryBlock` sur l'écran de détail, sous le titre et la date et avant le média, mention « Résumé généré automatiquement » (D8, skill `charte-ui`)
- [ ] 5.3 `LinkCard` et écran de détail : lien vers `media.url` quand il existe
- [ ] 5.4 Tests : bloc présent ou absent, lien vers l'éditeur

## 6. Validation

- [ ] 6.1 En local : `media --refresh` sur Google News, puis `summarize --budget 2` ; vérifier le web et le simulateur iOS
- [ ] 6.2 Échantillon d'environ 10 résumés présenté au porteur du projet ; ajuster la consigne si besoin (D7)
- [ ] 6.3 Smoke test : `byId` renvoie un résumé sur l'intervention de test ; `bun run check` et `bun run smoke:web` au vert

## 7. Documentation

- [ ] 7.1 `docs/architecture/resumes.md` : modèle, consigne, garde-fous, coûts, procédure de changement de modèle ou de consigne ; lien depuis `docs/architecture/README.md` (schéma, cycle du worker)
- [ ] 7.2 `docs/architecture/commandes.md` (`summarize`, `media --refresh`), `deploiement.md` (étapes de reprise, `SUMMARY_DAILY_BUDGET_USD`) et `.env.example`
- [ ] 7.3 `apps/worker/AGENTS.md` (module `summaries/`), `packages/db/AGENTS.md`, `apps/app/AGENTS.md`, `AGENTS.md` racine (état)
- [ ] 7.4 ADR 0021 déjà rédigé ; consigner tout écart avec le skill `record-decision`
