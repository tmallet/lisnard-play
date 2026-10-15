## 1. Données

- [ ] 1.1 Colonne `item.place` (jsonb) et type `PlaceRecord`, migration 0010
- [ ] 1.2 Écriture : cibles à traiter, enregistrement du lieu ; lecture : `listPlaces` (visibles, non reprises, avec coordonnées) ; tests

## 2. Worker

- [ ] 2.1 `src/places/prompt.ts` (consigne, `json_schema`, `PLACE_PROMPT_VERSION`) et client OpenRouter (réutilise celui des résumés)
- [ ] 2.2 `src/places/geocode.ts` : BAN pour les communes (score, département), table des centres de régions et de départements ; tests sur réponses enregistrées
- [ ] 2.3 Tâche `places` (5 min, lots de 20, plafond partagé, service indisponible sans échec, silencieuse à vide) ; tests
- [ ] 2.4 Vérification d'un échantillon d'une trentaine d'interventions réelles (lieu attendu / obtenu), consignée dans ce fichier

## 3. API

- [ ] 3.1 Procédure `campaign.places` (regroupement par lieu, cache d'une minute) ; tests

## 4. App

- [ ] 4.1 `scripts/build-france-map.ts` et `src/assets/france-regions.json` (régions simplifiées, Lambert-93, encarts d'outre-mer), source et licence citées
- [ ] 4.2 `CampaignMap` (fond, repères proportionnés, approximatifs distingués, sélection) et carte de la liste ; tests de la géométrie
- [ ] 4.3 Route `(tabs)/campagne` : sélecteur à deux vues dans l'adresse, `MembershipView` extraite ; `NAV_ITEMS` ; redirection de `/adhesions`
- [ ] 4.4 Vérification visuelle sur téléphone et ordinateur (captures)

## 5. Qualité et documentation

- [ ] 5.1 Smoke web : `/campagne`, `/campagne?vue=deplacements`, redirection de `/adhesions`, `campaign.places`
- [ ] 5.2 Pare-feu du devcontainer : `api-adresse.data.gouv.fr`
- [ ] 5.3 ADR 0027 et index ; `docs/architecture/README.md` (tâche `places`, procédure), `resumes.md` (budget partagé), AGENTS de l'app, du worker, de l'API et de la base
- [ ] 5.4 `bun run check` et `bun run smoke:web` au vert
