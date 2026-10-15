## 1. Données

- [ ] 1.1 Table `quote`, fonction `lp_normalize`, index plein texte (citations, titres et résumés), migration 0012
- [ ] 1.2 Écriture : citations remplacées avec le résumé (`recordSummary`) ; lecture : citations d'une intervention, citation par minutage, recherche ; tests

## 2. Worker

- [ ] 2.1 Consigne v4 et schéma (`quotes`), validation des minutages et des textes ; tests
- [ ] 2.2 Vérification d'un échantillon réel (une dizaine de vidéos : minutages, mots exacts), consignée ici

## 3. API

- [ ] 3.1 `interventions.byId` avec citations ; `quotes.at` ; `search.query` (normalisation, cache) ; tests

## 4. App

- [ ] 4.1 Lecteur avec point de départ (`playerUrl`, `?t=`)
- [ ] 4.2 Section « Citations » de l'écran de détail (minutage, partage, mention)
- [ ] 4.3 Page `interventions/[id]/citation/[t]` et repli vers l'intervention
- [ ] 4.4 Champ de recherche de l'accueil et résultats (`?q=`)
- [ ] 4.5 Vérification visuelle sur téléphone et ordinateur (captures)

## 5. Qualité et documentation

- [ ] 5.1 Smoke web : page d'une citation, recherche (`search.query`) avec accents
- [ ] 5.2 ADR 0028 et index ; `resumes.md` (consigne v4, citations), architecture, AGENTS
- [ ] 5.3 `bun run check` et `bun run smoke:web` au vert
