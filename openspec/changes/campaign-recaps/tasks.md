## 1. Données

- [x] 1.1 Colonnes `quote.striking` et `quote.striking_version` (migration 0014) ; écriture de la note, liste des citations à noter ; tests
- [x] 1.2 `getRecap` (interventions, médias, lieux, citation de plus haute note) et `listRecapDays` ; tests

## 2. Worker

- [x] 2.1 Question Jev « marquante » (`quotes/striking.ts`, `STRIKING_VERSION`), tâche `quotes:score`, commande `score-quotes` ; tests
- [x] 2.2 Vérification sur un échantillon réel (notes, citations retenues), consignée ici
  - 2026-10-16 : 39 citations locales notées pour 0,0007 $. En tête : « Le pouvoir peut rendre fou et con », « Au nom de l'égalité, on a fait de l'injustice », « C'est bien de savoir coder… décoder le monde » (0,79 à 0,80) ; en bas, les anecdotes (Mike Tyson, 0,22 à 0,35). Choix jugés pertinents.

## 3. API

- [x] 3.1 `recap.get` (période, adhésions, courbe) et `recap.list` ; cache ; tests

## 4. App

- [x] 4.1 Image `recap-card.ts` (courbe, carte, citation) et route `/campagne/recap/<période>/<date>.png` ; tests
- [x] 4.2 En-tête de `/campagne?jour=` et `?semaine=` réécrit par `server.ts` ; Dockerfile
- [x] 4.3 Récapitulatif dans la page Campagne, vue « Récaps », « Publier sur X » et « Partager » ; tests
- [x] 4.4 Vérification visuelle (téléphone, ordinateur, image réelle)

## 5. Qualité

- [x] 5.1 Smoke web : image d'un récapitulatif (1200 × 630, 404 sinon), en-tête réécrit
- [x] 5.2 `bun run check` et `bun run smoke:web` au vert

## 6. Documentation

- [x] 6.1 ADR 0031 et index ; `classifier.md` (question « marquante »), `docs/architecture/README.md`, AGENTS (app, worker, api, db), `commandes.md` (`score-quotes`)
