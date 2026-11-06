---
id: "0033"
title: Format des interventions déduit du rendu et de la durée, seuil de 5 minutes
status: accepted
date: 2026-11-06
tags: [produit, ui, donnees]
supersedes: null
superseded-by: null
related-specs: [intervention-feed]
related-changes: [feed-format-filter]
---

# 0033 — Format des interventions déduit du rendu et de la durée, seuil de 5 minutes

## Contexte

Un utilisateur veut filtrer les vidéos longues, les clips et les articles. Le champ
`kind`, rempli par Jev, décrit le canal et non le format :
- sur 424 interventions passées, 203 sont `stream`, sans distinction entre un clip et une
  émission complète ;
- sur un échantillon de 142 fiches, 22 des 51 contenus sans lecteur intégré ne sont pas
  `presse` (`tv`, `radio`, `meeting`).

Durée des 274 vidéos intégrées et publiées en production, le 2026-11-06 :

| Durée | Vidéos |
|-------|--------|
| 1 min au plus | 136 |
| 1 à 3 min | 91 |
| 3 à 5 min | 3 |
| 5 à 10 min | 5 |
| 10 à 30 min | 21 |
| plus de 30 min | 17 |
| inconnue | 1 |

## Décision

- Le format est **déduit à la lecture**, sans colonne ni appel à Jev :
  - `article` : rendu par un lien, sans lecteur intégré ;
  - `clip` : lecteur intégré et durée de 300 secondes au plus ;
  - `long` : lecteur intégré et durée supérieure, ou inconnue.
- Le filtre de l'accueil ne s'applique qu'aux interventions passées : un direct ou une
  intervention à venir reste visible.

## Alternatives écartées

- **Utiliser `kind`** : il ne sépare ni les clips des vidéos longues, ni les articles des
  liens vers une chaîne de télévision.
- **Nouvelle question Jev** : coût, recalibrage et `QUESTIONS_VERSION` pour une
  information que la durée donne déjà.
- **Seuil de 20 minutes des résumés** : il répond au coût du modèle, et classerait parmi
  les clips des vidéos de 5 à 20 minutes, qui ne sont plus des extraits.
- **Seuil de 3 minutes** : presque équivalent (3 vidéos d'écart), mais une vidéo de
  4 minutes reste un extrait.
- **Colonne calculée** : elle figerait le seuil dans une migration, pour un volume faible.

## Conséquences

- La règle vit dans une seule condition côté lecture : changer le seuil ne demande ni
  migration ni reprise de données, seulement un nouvel ADR.
- Une durée inconnue classe la vidéo en `long`, comme le choix du modèle de résumé.
- Un lien de télévision ou de radio apparaît sous « Articles », même s'il mène à une
  vidéo sur le site du média.
