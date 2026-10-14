---
id: "0020"
title: Périmètre recentré sur la campagne présidentielle et classement par thématiques
status: accepted
date: 2026-10-13
tags: [produit, perimetre, classifier, ui]
supersedes: "0006"
superseded-by: null
related-specs: [intervention-classification, intervention-feed, intervention-themes]
related-changes: [campaign-themes]
---

# 0020 — Périmètre recentré sur la campagne présidentielle et classement par thématiques

## Contexte

L'ADR 0006 incluait les interventions de David Lisnard en tant que président de
l'AMF, avec un filtre « National / AMF » sur l'accueil. Le 2026-10-13, le
porteur du projet a recentré l'application sur sa **campagne présidentielle**.
Il a aussi demandé des filtres plus utiles au visiteur, par thématique.

Une même intervention, par exemple une matinale TV, aborde souvent plusieurs
sujets.

## Décision

- **Inclus** : les interventions publiques où David Lisnard s'exprime lui-même
  en tant que candidat à la présidentielle 2027, fondateur de Nouvelle Énergie
  ou responsable politique national, quel que soit le format.
- **Exclu** :
  - les interventions au titre de l'AMF ;
  - les interventions en tant que maire de Cannes ;
  - les contenus qui le citent sans qu'il intervienne lui-même.
- **Cas limites**, tranchés par le rôle dominant que renvoie le classifieur
  (ADR 0004) :
  - un sujet local, cannois ou communal, utilisé comme argument de campagne
    relève de `national` ;
  - une prise de parole sur les finances des collectivités au nom des maires
    relève de `amf`.
- **Thématiques** : sept thèmes, avec la possibilité d'en attribuer plusieurs ou
  aucun. La liste et les définitions sont dans la spec `intervention-themes` :
  Économie, Sécurité, Immigration, Éducation, Institutions, International et
  Vie de campagne.
- **Attribution par Jev** : une question oui/non (Noul) par thème. Un thème est
  retenu au-dessus d'un seuil `τ_theme` défini par modèle, comme les autres
  seuils. Les probabilités brutes sont journalisées (ADR 0018), ce qui permet
  de recalculer les thèmes sans rappeler le modèle.
- **Liste fermée** : la liste des thèmes est codée et versionnée avec les
  questions. Toute modification incrémente la version des questions.
- **Chaîne officielle** : elle suit les mêmes règles (ADR 0018). Une vidéo AMF
  de sa chaîne est écartée.

## Alternatives écartées

- **Conserver l'AMF avec son filtre** : décision contraire du porteur du projet.
- **Un seul thème dominant (Choice)** : une interview multi-sujets n'aurait été
  trouvable que sous un thème.
- **Thèmes libres générés par un modèle de langage** : liste instable,
  impossible à filtrer, et Jev ne produit pas de texte (ADR 0004).
- **Liste longue (10 thèmes ou plus)** : trop de filtres sur un téléphone ; le
  porteur du projet a retenu la liste courte.

## Conséquences

- Seul le rôle `national` est publiable. Les contenus AMF déjà publiés sont
  écartés par un recalcul, sans appel au modèle.
- Coût du classement : environ 10 questions par contenu au lieu de 3, soit de
  l'ordre de 0,0001 $ par contenu.
- L'API expose `themes` à la place de `role`, et le filtre de liste porte sur le
  thème.
- Le jeu de référence est mis à jour : les cas `amf` deviennent des cas à
  écarter. `τ_theme` est vérifié sur un échantillon validé par le porteur du
  projet.
