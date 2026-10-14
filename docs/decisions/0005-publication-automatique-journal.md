---
id: "0005"
title: Publication tout automatique et journal des décisions du classifieur
status: superseded
date: 2026-10-13
tags: [ingestion, ia, classifier, notifications]
supersedes: null
superseded-by: "0018"
related-specs: []
related-changes: []
---

# 0005 — Publication tout automatique et journal des décisions du classifieur

## Contexte

Il n'y a pas de modérateur humain pour l'instant. La qualité de ce qui est
publié et notifié dépend donc entièrement du classifieur (ADR 0004) et des
seuils choisis.

## Décision

- **Aucune file de modération** : une intervention est publiée si et seulement si
  `noul(intervient) ≥ τ₁` ET `role ∈ {national, amf}` avec une confiance ≥ τ₂.
  Sinon, elle est rejetée, mais conservée.
- Une **notification** n'est envoyée que pour un live détecté de façon
  déterministe ET au-delà de seuils plus stricts (τ₁', τ₂'). Une fausse alerte
  coûte plus cher qu'un oubli.
- **Chaque décision est journalisée** : identifiant du contenu, `model`,
  `questionsVersion`, probabilités brutes de chaque question, seuils appliqués,
  résultat et date. On peut ainsi :
  - recalculer la publication après un changement de seuils, sans rappeler le modèle ;
  - expliquer pourquoi un élément a été publié ou écarté ;
  - comparer deux modèles sur le même historique (exécution en parallèle).
- Un **jeu de référence** étiqueté à la main (une centaine de cas, cas limites
  compris) sert à fixer les seuils et à détecter les régressions.

## Alternatives écartées

- **File de modération humaine** : pas de modérateur disponible. Le
  journal permet d'en ajouter une plus tard sans refonte.

## Conséquences

- Les contenus rejetés restent en base, avec leur décision.
- Le rattrapage de l'historique et les reclassifications en masse sont peu
  coûteux.

## Points ouverts

- Valeurs initiales de τ₁, τ₂, τ₁' et τ₂', à fixer à partir du jeu de référence.
- ~~Date de début de l'historique.~~ Tranché : 31 mars 2026 (ADR 0016).
