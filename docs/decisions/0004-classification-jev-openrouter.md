---
id: "0004"
title: Classifier la pertinence avec Jev via OpenRouter (System One)
status: accepted
date: 2026-10-13
tags: [ingestion, ia, classifier]
supersedes: null
superseded-by: null
related-specs: []
related-changes: []
---

# 0004 — Classifier la pertinence avec Jev via OpenRouter (System One)

## Contexte

Les sources (flux YouTube, podcasts, presse) remontent beaucoup de bruit. Il
faut décider automatiquement si un contenu est une intervention de David
Lisnard qui entre dans le périmètre (ADR 0006).

Jev (TypeSafe) est un modèle « System One » : il reçoit un état (texte ou JSON)
et des questions typées, et renvoie des décisions avec des probabilités
calibrées. Il expose trois primitives : **Choice** (choix parmi au plus 255
options), **Score** (note selon une grille) et **Noul** (probabilité qu'un
énoncé soit vrai). Il **ne génère pas de texte libre**.

Sources : https://typesafe.ai/blog/introducing-system-one-models-and-jev,
https://docs.typesafe.ai, https://openrouter.ai/docs/guides/community/jev

## Décision

- On appelle Jev **via OpenRouter**, sur l'endpoint System One
  (`POST https://openrouter.ai/api/v1/systemone`), avec le SDK TypeSafe JS
  configuré sur l'URL de base et la clé OpenRouter. On pourra ainsi passer à
  un autre modèle compatible System One (ex. Drex de Nace.AI) en changeant
  seulement l'identifiant.
- Le modèle est **épinglé** : `typesafe/jev-1.13`. L'alias
  `~typesafe/jev-latest` est interdit, car une montée de version décale la
  calibration et rend les seuils caducs.
- Partage des rôles :
  - **Déterministe (code)** : titre, URL, dates, média (d'après la chaîne ou
    le flux d'origine), statut live ou programmé (API de la plateforme), rendu
    du média (ADR 0007).
  - **Jev (décisions)** :
    - Noul : « David Lisnard intervient lui-même dans ce contenu »
    - Choice `role` : `national | amf | mairie | hors_sujet`
    - Choice `kind` : `tv | radio | presse | podcast | meeting | discours | stream | reseau_social`
- Les **seuils sont configurés par modèle** (`thresholds[modelId]`), avec un
  jeu pour la publication et un jeu plus strict pour les notifications.
- Le client est isolé derrière une interface `Classifier` dans le worker.

## Alternatives écartées

- **LLM généraliste en sortie structurée** : plus lent et plus cher, et ses
  probabilités ne sont pas calibrées. Il reste une solution de repli si
  aucun modèle System One n'est disponible.
- **Appel direct à l'API TypeSafe** : nous lierait à un seul fournisseur.
- **Règles par mots-clés seules** : incapables de trancher les cas limites
  (mairie ou campagne, simple citation ou intervention).

## Conséquences

- Changer de modèle impose de rejouer le jeu de référence, de recalibrer les
  seuils, puis de basculer, de préférence après une exécution en parallèle sans
  publication (ADR 0005).
- Toute modification des questions incrémente une `questionsVersion`.
- La clé `OPENROUTER_API_KEY` n'existe que côté worker.

## Points ouverts

- Schéma exact de `/api/v1/systemone` (passage du `model`, format des
  questions) à confirmer avec le SDK JS lors d'un spike.
- Tenue de la calibration sur du contenu en français.
- Jev est en accès anticipé et son prix est peut-être subventionné (selon
  l'annonce) : surveiller.
