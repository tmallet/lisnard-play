## Why

Un utilisateur demande à pouvoir retrouver facilement les vidéos longues, les clips et
les articles de presse. Le flux ne se filtre aujourd'hui que par thème : les 43 vidéos
longues y sont noyées parmi 230 clips (production, 2026-11-06).

## What Changes

- Chaque intervention a un format déduit de son rendu et de sa durée : « Vidéos longues »,
  « Clips » ou « Presse et médias » (ADR 0033).
- L'API de liste accepte un filtre par format, combinable avec le filtre par thème.
- L'accueil affiche une seconde rangée de pastilles sous les thèmes. Le format ne filtre
  que la section « Passées » : les directs et les interventions à venir restent visibles.

## Capabilities

### New Capabilities

Aucune.

### Modified Capabilities

- `intervention-feed` : format d'une intervention, filtre de l'API et de l'accueil.

## Impact

- `packages/db` : filtre SQL de `listPublished`, sans migration.
- `packages/api` : paramètre facultatif `format` de `interventions.list`, sans rupture
  pour les clients existants.
- `apps/app` : pastilles de format sur l'accueil, requête des interventions passées.
- Aucun appel supplémentaire à Jev, aucun changement de `QUESTIONS_VERSION` (ADR 0004,
  ADR 0018), aucun coût. Le rendu des médias reste celui de l'ADR 0007.

## Hors périmètre

- Filtre par canal (télévision, radio, sa chaîne), qui resterait possible avec `kind`.
- Filtre par format dans la recherche, la carte ou les récapitulatifs.
- Format affiché sur les cartes, et durée de la vidéo.
- Filtres conservés dans l'adresse de la page.
