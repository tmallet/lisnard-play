---
id: "0026"
title: Données d'adhésion de Nouvelle Énergie lues par l'API avec un cache, sans copie en base
status: accepted
date: 2026-10-15
tags: [donnees, api, independance, dependance-externe]
supersedes: null
superseded-by: null
related-specs: [membership-timeline]
related-changes: [membership-timeline]
---

# 0026 — Données d'adhésion de Nouvelle Énergie lues par l'API avec un cache, sans copie en base

## Contexte

La page « Adhésions » met en regard le nombre d'adhérents de Nouvelle Énergie et les
interventions de David Lisnard. Le parti publie deux fichiers JSON en libre accès :
- le total en cours ;
- l'historique quotidien depuis le 1er janvier 2026.

Ces fichiers sont ouverts à toutes les origines et mis en cache 60 secondes. Leur page
de documentation exige une connexion : ni licence ni conditions de réutilisation ne
sont publiées.

## Décision

- **Lecture par le serveur de l'app** (API tRPC), jamais par le navigateur ou
  l'appareil du visiteur : la source n'est pas exposée à chaque visite, et nos
  visiteurs ne sont pas exposés à un tiers (ADR 0022).
- **Cache en mémoire de 90 secondes**, avec une seule requête en vol, et la dernière
  valeur valide servie si la source tombe ou change de format (validation stricte).
- **Aucune copie en base** : l'historique appartient au parti, et la page en dépend.
  La frontière d'écriture (ADR 0017) est inchangée.
- **Transparence** : source citée sur la page, et rappel qu'une coïncidence n'est pas
  un effet démontré.
- **Indépendance** (ADR 0001) : charte de l'app, sans logo ni visuel du parti.

## Alternatives écartées

- **Copie quotidienne en base par le worker** : plus robuste face à la disparition de
  la source, mais une table et une tâche de plus, pour des données qui ne sont pas les
  nôtres. Ce sera à reconsidérer si la source devient instable.
- **Lecture directe depuis le navigateur** : possible techniquement (CORS ouvert),
  mais sans cache partagé, et chaque visiteur contacterait un site tiers.

## Conséquences

- Si le parti modifie ou retire ces fichiers, la page montre la dernière valeur
  connue tant que le serveur tourne, puis un message d'indisponibilité.
- La base de l'adresse est configurable (`MEMBERSHIP_SOURCE_URL`) pour les tests.
