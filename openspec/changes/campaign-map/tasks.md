## 1. Données

- [x] 1.1 Colonne `item.place` (jsonb) et type `PlaceRecord`, migration 0010
- [x] 1.2 Écriture : cibles à traiter, enregistrement du lieu ; lecture : `listPlaces` (visibles, non reprises, avec coordonnées) ; tests

## 2. Worker

- [x] 2.1 `src/places/prompt.ts` (consigne, `json_schema`, `PLACE_PROMPT_VERSION`) et client OpenRouter (réutilise celui des résumés)
- [x] 2.2 `src/places/geocode.ts` : BAN pour les communes (score, département), table des centres de régions et de départements ; tests sur réponses enregistrées
- [x] 2.3 Tâche `places` (5 min, lots de 20, plafond partagé, service indisponible sans échec, silencieuse à vide) ; tests
- [x] 2.4 Vérification d'un échantillon d'une trentaine d'interventions réelles (lieu attendu / obtenu), consignée dans ce fichier

  Vérifié le 15 octobre 2026 sur les 218 interventions locales (coût 0,045 $) : 14 déplacements situés, tous plausibles. Le chiffre est passé de 16 à 14 entre deux passes (« Samuel Paty », débat de la REF : lieu non indiqué).
  - Communes explicites : Saint-Raphaël, Bayeux (×2), Cannes (rentrée, La Gagne, cérémonie du 8 mai), Benfeld (meeting d'Alsace, lieu précisé dans la description), Paris (assises de l'AFER).
  - Approximatifs : Strasbourg (« meeting en Alsace » sans commune, ×2, et un extrait de ce meeting), Bordeaux (communes sinistrées de Gironde et des Landes), Le Mans (« dans la Sarthe »).
  - Écartés à raison : plateaux BFMTV, LCI, RMC, CNews ; débat de la REF et duel avec Édouard Philippe (lieu non indiqué) ; anecdote « rencontre avec Mike Tyson à Cannes » (ce n'est pas un déplacement).
  - Correction apportée : la Base adresse nationale doit recevoir la commune seule (y ajouter le département fait chuter le score) ; le département sert ensuite à départager les homonymes.

- [x] 2.5 Commande `cli places [--budget N]` : traite tout l'historique d'un coup après le déploiement

## 3. API

- [x] 3.1 Procédure `campaign.places` (regroupement par lieu, cache d'une minute) ; tests

## 4. App

- [x] 4.1 `scripts/build-france-map.ts` et `assets/france-map.json` (régions simplifiées, projection équirectangulaire corrigée de la latitude, encarts d'outre-mer), source et licence citées
- [x] 4.2 `CampaignMap` (fond, repères proportionnés, approximatifs distingués, sélection) et carte de la liste ; tests de la géométrie
- [x] 4.3 Route `(tabs)/campagne` : sélecteur à deux vues dans l'adresse, `MembershipView` extraite ; `NAV_ITEMS` ; redirection de `/adhesions`
- [x] 4.4 Vérification visuelle sur téléphone et ordinateur (captures)

## 5. Qualité et documentation

- [x] 5.1 Smoke web : `/campagne`, `/campagne?vue=deplacements`, redirection de `/adhesions`, `campaign.places`
- [x] 5.2 Pare-feu du devcontainer : `api-adresse.data.gouv.fr`
- [x] 5.3 ADR 0027 et index ; `docs/architecture/README.md` (tâche `places`, procédure), `resumes.md` (budget partagé), AGENTS de l'app, du worker, de l'API et de la base
- [x] 5.4 `bun run check` et `bun run smoke:web` au vert
