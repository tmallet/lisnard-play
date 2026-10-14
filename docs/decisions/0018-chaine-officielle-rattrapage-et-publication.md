---
id: "0018"
title: Publication automatique, journal des décisions et cas de la chaîne officielle
status: accepted
date: 2026-10-13
tags: [ingestion, ia, classifier, notifications]
supersedes: "0005"
superseded-by: null
related-specs: [intervention-collection, intervention-classification]
related-changes: [intervention-ingestion]
---

# 0018 — Publication automatique, journal des décisions et cas de la chaîne officielle

## Contexte

L'ADR 0005 a fixé une publication tout automatique et un journal complet des
décisions. Pendant l'implémentation (2026-10-13), deux constats l'ont fait
évoluer :

- **Rattrapage** : le flux RSS d'une chaîne YouTube ne contient que ses
  15 dernières vidéos. La chaîne officielle **@david_lisnard** en compte 332,
  dont 195 depuis le début de l'historique (ADR 0016). Sa playlist « uploads »
  les liste toutes pour 1 unité de quota par page de 50, soit 8 unités au total
  avec l'enrichissement par `videos.list`.
- **Chaîne officielle** : avec un seuil `τ_intervient = 0,75` calibré sur des
  articles de presse, 45 de ses propres vidéos (sur 195) étaient écartées.
  Sur des extraits courts, le modèle hésite (probabilité entre 0,6 et 0,74),
  alors que c'est presque toujours lui qui parle.

## Décision

Ce qui reprend l'ADR 0005 :
- **Publication tout automatique**, sans file de modération. Un contenu non
  publié reste en base.
- **Notifications** réservées aux directs détectés de façon déterministe, avec
  des seuils plus stricts. C'est un change ultérieur.
- **Journal complet** en ajout seul : modèle, version des questions,
  probabilités brutes, seuils, résultat, date. Il permet le recalcul sans
  appel au modèle, l'explication des décisions et la comparaison entre
  modèles.
- **Jeu de référence validé** et calibration des seuils
  (`docs/architecture/classifier.md`).

Ce qui change :
- **Règle de publication** : un contenu est publié si et seulement si :
  - `intervient ≥ τ_intervient`, **sauf** s'il provient de la chaîne
    officielle de David Lisnard (`official: true` dans la configuration des
    sources), où son intervention est présumée ;
  - le rôle le plus probable est `national` ou `amf` ;
  - la confiance de ce rôle est `≥ τ_role`.

  Sur la chaîne officielle, le filtre sur le rôle reste actif : une vidéo sur
  la ville de Cannes (`mairie`) reste écartée (ADR 0006).
- **Rattrapage des chaînes officielles** : toutes leurs vidéos depuis le début
  de l'historique sont collectées via la playlist « uploads »
  (`playlistItems.list`), au démarrage du worker puis une fois par jour, ou à
  la demande (`bun cli.js backfill`). Le parcours s'arrête à la première vidéo
  antérieure au début de l'historique.

## Alternatives écartées

- **Abaisser `τ_intervient` pour toutes les sources** : il ferait publier des
  articles qui ne font que citer David Lisnard. Sur le jeu de référence, la
  précision descend vers 91 %.
- **Additionner les probabilités `national` et `amf`** : neutre sur le jeu de
  référence, et elle aurait rattrapé 12 vidéos de plus. Non retenue par le
  porteur du projet pour l'instant.
- **Rattrapage par l'API de recherche (`search.list`)** : 100 unités par appel.
- **Rattrapage complet des chaînes de médias** : environ 1 000 unités une
  fois, pour peu de résultats après le pré-filtre sur le nom. Non retenu pour
  l'instant.

## Conséquences

- Sur la base de développement, 180 des 195 vidéos de la chaîne officielle
  sont publiées. Les autres relèvent de la mairie ou ont une confiance de rôle
  insuffisante.
- Marquer une source `official: true` engage : n'y mettre que des chaînes dont
  David Lisnard est l'auteur.
- `recompute` et la classification appliquent la même règle, qui dépend de la
  source du contenu.
