## Why

Le compte X de Lisnard Play a besoin d'un rendez-vous régulier qui donne envie de venir
sur le site. Un récapitulatif du jour et de la semaine croise ce qu'aucune autre source
ne croise : ce que David Lisnard a dit (interventions, citation la plus marquante), où
il était et l'évolution des adhésions. Un lien suffit pour l'afficher partout en image,
et il mène à la page Campagne.

## What Changes

- **Note « marquante » de chaque citation** par Jev (question vrai/faux), calculée une
  fois par le worker à l'extraction et gardée en base. Une commande de rattrapage note
  les citations existantes.
- **Récapitulatifs** :
  - du jour : un jour d'heure de Paris, seulement s'il compte au moins une
    intervention ;
  - de la semaine : du lundi au dimanche.

  Chaque récapitulatif contient le nombre d'interventions, les médias regroupés, les
  lieux des déplacements, les nouveaux adhérents et la courbe des derniers jours, et la
  citation la mieux notée.
- **Page Campagne** :
  - `?jour=AAAA-MM-JJ` et `?semaine=AAAA-MM-JJ` (le lundi) ouvrent le récapitulatif de
    la période, avec la liste de ses interventions ;
  - une vue « Récaps » liste les jours et les semaines récents, avec « Publier sur X »
    (message pré-rempli, publication manuelle) et « Partager ».
- **Aperçu du lien** : image paysage du récapitulatif (`/campagne/recap/jour/<date>.png`,
  `…/semaine/<date>.png`), et en-tête de la page Campagne réécrit par le serveur pour ces
  adresses (même technique que l'ADR 0030).
- Nouvel ADR 0031.

## Capabilities

### New Capabilities

- `campaign-recaps` : récapitulatifs du jour et de la semaine, note des citations,
  partage.

### Modified Capabilities

Aucune exigence existante ne change ; la page Campagne gagne une vue décrite par la
nouvelle capability.

## Hors périmètre

- Publication automatique sur X par l'API : manuelle pour commencer, décision du
  porteur du projet.
- Récapitulatif mensuel.
- Courbe des adhésions centrée sur le jour dans la vue « Adhésions » : le récapitulatif
  affiche sa propre courbe.

## Impact

- `packages/db` :
  - colonnes `striking` et `striking_version` de `quote` (migration 0014) ;
  - lectures des récapitulatifs.
- `apps/worker` : question Jev « marquante » (`quotes/striking.ts`), tâche
  `quotes:score`, commande `score-quotes`. Coût : un appel Jev par citation, une fois.
- `packages/api` : procédures `recap.get` et `recap.list` ; adhésions lues par la
  source existante (ADR 0026).
- `apps/app` : image du récapitulatif et réécriture de l'en-tête dans `server.ts`, vue
  « Récaps » et récapitulatif dans la page Campagne.
