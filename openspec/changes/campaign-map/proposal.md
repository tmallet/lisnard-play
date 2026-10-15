## Why

Le site recense où et quand David Lisnard prend la parole, mais pas où il se rend.
Ses déplacements (meetings, discours, visites, interviews en région) dessinent la
géographie de sa campagne. Une carte de France les rend visibles d'un coup d'œil.
Les plateaux parisiens, qui forment la majorité des interventions, sont exclus :
ils écraseraient la carte sans rien raconter.

## What Changes

- **Onglet « Campagne »** : l'onglet « Adhésions » est renommé et réunit deux vues,
  « Adhésions » (la courbe actuelle) et « Déplacements » (la carte). L'adresse
  `/campagne` remplace `/adhesions`, qui y redirige.
- **Lieu des interventions** : pour chaque intervention publiée, le worker demande à
  un modèle (Gemini léger via OpenRouter), à partir du titre et de la description
  seulement, si l'intervention s'est tenue sur place hors d'un studio et où. Le lieu
  est ensuite situé par la Base adresse nationale, puis stocké en base. Réponse
  « aucun lieu » plutôt qu'une invention ; un lieu flou (« en Alsace ») est placé au
  centre de la région et signalé comme approximatif.
- **Carte** : carte de France en SVG (contours des régions, données IGN en licence
  ouverte, simplifiées et intégrées à l'app), outre-mer en encarts, aux couleurs de
  la charte, sans service tiers. Un point par lieu, de taille croissante avec le
  nombre d'interventions ; toucher un point affiche la liste de ses interventions,
  avec un lien vers chacune.
- **Coût** : imputé sur le plafond quotidien des résumés (ADR 0021) ; l'historique,
  environ 220 interventions, coûte quelques centimes.
- Nouvel ADR 0027.

## Capabilities

### New Capabilities
- `intervention-places` : lieu des déplacements (extraction, géolocalisation,
  stockage) et carte des déplacements.

### Modified Capabilities
- `membership-timeline` : l'onglet « Adhésions » devient l'onglet « Campagne »,
  avec deux vues.

## Impact

- **Base** : colonne `item.place` (jsonb : lieu, commune, coordonnées, précision,
  modèle, version de consigne), migration 0010 ; lecture `listPlaces` ; écriture
  par le worker.
- **Worker** : `src/places/` (consigne, client OpenRouter, géolocalisation BAN,
  tâche `places`), budget partagé avec les résumés.
- **API** : procédure `campaign.places`.
- **App** : route `(tabs)/campagne` avec ses deux vues, redirection de
  `/adhesions`, composant `CampaignMap` (`react-native-svg`), contours des régions
  dans `src/assets/`.
- **Pare-feu** : `api-adresse.data.gouv.fr`.
- ADR concernés : 0001 (charte), 0017 (frontière d'écriture, lectures externes),
  0020 (périmètre), 0021 (résumés, budget), 0022 (confidentialité), 0026.

## Hors périmètre

- Lieux à l'étranger (non affichés pour l'instant).
- Carte zoomable avec tuiles (OpenStreetMap, Google, Apple).
- Lieu extrait de la vidéo elle-même (image ou son).
- Saisie ou correction manuelle des lieux dans l'interface.
