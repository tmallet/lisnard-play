---
id: "0001"
title: Application indépendante, non affiliée à la campagne
status: accepted
date: 2026-10-13
tags: [produit, juridique, charte]
supersedes: null
superseded-by: null
related-specs: []
related-changes: []
---

# 0001 — Application indépendante, non affiliée à la campagne

## Contexte

L'application recense les interventions publiques de David Lisnard, candidat à
la présidentielle 2027. Elle n'est pas produite par sa campagne ni par Nouvelle
Énergie. Elle reprend pourtant les couleurs de la charte, visibles sur
https://www.lisnard2027.fr, ce qui peut faire croire à une application officielle.

## Décision

- L'application est **indépendante** et le dit explicitement : une mention
  « Application indépendante, non affiliée à David Lisnard ni à Nouvelle
  Énergie » figure dans le pied de page web et dans l'écran « À propos ».
- On reprend **uniquement** la palette et la police de la charte :

  | Token        | Valeur    | Usage                                   |
  |--------------|-----------|-----------------------------------------|
  | bleu         | `#1d257a` | couleur principale                      |
  | bleu-sombre  | `#0f1752` | fond (dégradé 160° bleu → bleu-sombre)  |
  | chamois      | `#b0ad85` | accent, un seul mot-clé par titre       |
  | blanc        | `#f9f9f9` | texte                                   |
  | emeraude     | `#52c985` | focus, indicateur « en direct »         |

  Police : Montserrat (400, 600, 700, 800). Titres en 800, en majuscules.
- On **n'utilise pas** le logo Nouvelle Énergie, l'hexagone signature ni
  aucun visuel officiel de la campagne.
- Le nom de l'application ne doit pas suggérer un lien officiel (nom encore à
  définir).
- Les données proviennent exclusivement de sources publiques.

## Alternatives écartées

- **Reprendre l'identité complète (logo, hexagone)** : risque de confusion
  avec la campagne et de contestation.
- **Identité visuelle propre** : écartée, l'usage de la palette est voulu.

## Conséquences

- Aucun accès à l'agenda de campagne : certaines interventions programmées
  seront connues en retard ou pas du tout.
- Tout travail d'interface respecte cette charte réduite. Un skill dédié la
  détaillera quand l'UI existera.

## Points ouverts

- Nom définitif de l'application (le nom du dépôt « lisnard-play » est provisoire).
