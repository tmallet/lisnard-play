---
id: "0034"
title: Logo Projet Lisnard dans l'en-tête web
status: accepted
date: 2026-11-07
tags: [charte, ui, produit]
supersedes: null
superseded-by: null
related-specs: [intervention-feed]
related-changes: [group-style-ui]
---

# 0034 — Logo Projet Lisnard dans l'en-tête web

## Contexte

Lisnard Play fait partie des outils du collectif Projet Lisnard (projetlisnard.fr,
retraite.projetlisnard.fr, studio.projetlisnard.fr), qui partagent un logo et une
mise en forme : surtitres en petites capitales, cartes très arrondies, liseré sur le
bord haut. L'ADR 0001 exclut le logo Nouvelle Énergie, l'hexagone signature du parti et
tout visuel officiel de la campagne ; le logo Projet Lisnard est celui du collectif de
soutiens, pas celui du parti.

## Décision

- L'en-tête web affiche le logo Projet Lisnard, version pour fond sombre
  (`apps/app/assets/images/projet-lisnard.webp`), à gauche du nom de l'application. Il est
  décoratif pour les lecteurs d'écran : le nom de l'application suffit.
- L'application reprend la mise en forme des sites du collectif sans en reprendre le fond
  clair : surtitre chamois (`Eyebrow`), cartes à 20 px, liseré chamois sur le bord haut.
- Le logo Nouvelle Énergie, l'hexagone signature du parti et les visuels de campagne
  restent exclus (ADR 0001), ainsi que la mention d'indépendance sur chaque écran.

## Alternatives écartées

- **Aucun logo** : l'application ne se rattachait pas visuellement aux autres outils du
  collectif.
- **Fond clair des sites du collectif** : il effaçait l'identité propre de Lisnard Play
  (dégradé bleu, titres en capitales).

## Conséquences

- Le logo n'apparaît que sur le web ; l'app mobile garde son surtitre avec le nom.
- Toute autre version du logo doit rester lisible sur le dégradé bleu (texte clair).
