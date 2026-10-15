## 1. Données

- [x] 1.1 Table `quote`, fonction `lp_normalize`, index plein texte (citations, titres et résumés), migration 0012
- [x] 1.2 Écriture : citations remplacées avec le résumé (`recordSummary`) ; lecture : citations d'une intervention, citation par minutage, recherche ; tests

## 2. Worker

- [x] 2.1 Consigne v4 et schéma (`quotes`), validation des minutages et des textes ; tests
- [x] 2.2 Vérification d'un échantillon réel (une dizaine de vidéos : minutages, mots exacts), consignée ici
  - 2026-10-15 : dix vidéos locales, 0,21 $. Phrases fidèles à l’écoute, thèmes pertinents ; deux montages d’une même émission donnent 10:41 et 10:56 pour la même phrase, cohérents avec le décalage des montages. Environ 0,02 $ par vidéo, soit 4 $ pour l’historique.

## 3. API

- [x] 3.1 `interventions.byId` avec citations ; `quotes.at` ; `search.query` (normalisation, cache) ; tests

## 4. App

- [x] 4.1 Lecteur avec point de départ (`playerUrl`, `?t=`)
- [x] 4.2 Section « Citations » de l'écran de détail (minutage, partage, mention)
- [x] 4.3 Page `interventions/[id]/citation/[t]` et repli vers l'intervention
- [x] 4.4 Champ de recherche de l'accueil et résultats (`?q=`)
- [x] 4.5 Vérification visuelle sur téléphone et ordinateur (captures)

## 5. Qualité et documentation

- [x] 5.1 Smoke web : page d'une citation, recherche (`search.query`) avec accents
- [x] 5.2 ADR 0028 et index ; `resumes.md` (consigne v4, citations), architecture, AGENTS
- [x] 5.3 `bun run check` et `bun run smoke:web` au vert
