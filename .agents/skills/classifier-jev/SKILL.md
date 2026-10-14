---
name: classifier-jev
description: Modifier le classifieur Jev du worker (questions, seuils, règle de publication, modèle) et le recalibrer. À utiliser dès qu'on touche apps/worker/src/classifier/, qu'on change de modèle OpenRouter, qu'on ajuste les seuils ou qu'on enrichit le jeu de référence eval/reference.jsonl.
---

# Faire évoluer le classifieur Jev

Décisions : ADR 0004 (Jev via OpenRouter), ADR 0006 (périmètre), ADR 0018
(règle de publication, chaîne officielle). Description complète et calibration
en cours : `docs/architecture/classifier.md`. Comportement attendu : spec
`intervention-classification`.

## Fichiers

| Fichier | Rôle |
|---------|------|
| `apps/worker/src/classifier/questions.ts` | Questions et `QUESTIONS_VERSION` |
| `apps/worker/src/classifier/systemone.ts` | Appel OpenRouter, `PINNED_MODEL`, lecture des réponses |
| `apps/worker/src/classifier/thresholds.ts` | Seuils par identifiant de modèle |
| `apps/worker/src/classifier/decide.ts` | Règle de publication (pure, testée) |
| `apps/worker/src/publish.ts` | Classification, `recompute`, `reclassify` |
| `apps/worker/eval/reference.jsonl` | Jeu de référence validé par le porteur du projet |

## Invariants

- **Modèle épinglé** sur un instantané daté (`typesafe/jev-1.13-20260917`),
  jamais un alias qui suit la dernière version.
- **Pas de seuils, pas de publication** : un modèle absent de `thresholds.ts`
  classe et journalise, mais ne publie rien.
- **Journal en ajout seul** : ne jamais modifier ni supprimer une ligne de
  `classification`.
- **Toute modification du texte des questions incrémente `QUESTIONS_VERSION`.**
  L'empreinte d'entrée change, et le worker reclasse tout seul.
- **Précision d'abord** : maximiser la précision avec un rappel d'au moins 80 %.
- `OPENROUTER_API_KEY` ne vit que dans le worker et le `.env` : ne jamais
  l'afficher.

## Changer les seuils

1. `bun apps/worker/src/cli.ts calibrate --validated` : précision, rappel et
   seuils proposés.
2. Reporter les seuils dans `thresholds.ts`.
3. `bun apps/worker/src/cli.ts recompute` : réapplique la règle aux décisions
   journalisées, sans appel au modèle.
4. Mettre à jour les tableaux de `docs/architecture/classifier.md`.

## Changer les questions

1. Modifier `questions.ts` et incrémenter `QUESTIONS_VERSION`.
2. `calibrate --validated` : les cas du jeu de référence sont reclassés avec la
   nouvelle version. Comparer à la calibration précédente.
3. Mettre à jour la section « Questions » et l'historique de calibration de
   `classifier.md`.
4. Si le sens d'une question change (nouveau rôle, nouvel ordre de grandeur),
   consigner la décision avec le skill `record-decision`.

## Changer de modèle

1. Vérifier l'instantané sur OpenRouter et son endpoint (`/api/v1/systemone`).
2. Lancer `calibrate --validated --model <nouveau>` et ajouter ses seuils dans
   `thresholds.ts`.
3. Mettre à jour `PINNED_MODEL`.
4. `bun apps/worker/src/cli.ts reclassify --model <ancien>` : nouvelle entrée de
   journal pour chaque contenu classé par l'ancien modèle.
5. Consigner le changement dans un ADR (`record-decision`) et dans
   `classifier.md`.

## Changer la règle de publication

`decide.ts` reste une fonction pure. Toute exception (comme la présomption pour
la chaîne officielle) s'applique de la même façon dans `classifyPending`,
`recompute` et `reclassify`, via `isOfficialSource`. Ajouter un scénario dans
la spec `intervention-classification` et un test dans `publish.test.ts`.

## Enrichir le jeu de référence

Une ligne JSON par cas, avec la décision attendue **validée par le porteur du
projet** : ne jamais étiqueter un cas soi-même puis l'utiliser pour calibrer.
Présenter les cas douteux au porteur du projet, puis ajouter ses réponses.

## Conclure

`bun run check` (les tests de `decide` et `publish` ne dépendent pas des seuils
de production).
