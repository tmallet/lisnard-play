---
id: "0006"
title: Périmètre des interventions — tout sauf la mairie de Cannes
status: superseded
date: 2026-10-13
tags: [produit, perimetre, classifier]
supersedes: null
superseded-by: "0020"
related-specs: []
related-changes: []
---

# 0006 — Périmètre des interventions : tout sauf la mairie de Cannes

## Contexte

David Lisnard cumule plusieurs rôles : candidat, fondateur de Nouvelle
Énergie, président de l'Association des maires de France (AMF) et maire de
Cannes. Le rôle de maire produit une grande quantité d'interventions locales,
hors du sujet de l'application.

## Décision

- **Inclus** : toute intervention publique où David Lisnard s'exprime lui-même
  (TV, radio, presse, podcast, meeting, discours, live, réseau social), quel que
  soit le sujet, **sauf** si elle relève de sa fonction de maire de Cannes.
- **AMF inclus**, avec l'étiquette `role: amf`, filtrable dans l'interface.
- **Exclu** :
  - les interventions en tant que maire de Cannes (vie municipale, Festival,
    événements de la ville) ;
  - les contenus qui le citent sans qu'il intervienne lui-même.
- **Cas limites**, tranchés par le classifieur (ADR 0004) selon le rôle
  dominant :
  - un sujet local cannois utilisé comme argument national relève de `national` ;
  - une communication institutionnelle de la ville relève de `mairie`.
- Les interventions passées comme en direct sont concernées. La date de début de
  l'historique sera fixée plus tard.

## Alternatives écartées

- **Campagne uniquement** : exclurait l'AMF, très présente dans les médias
  et proche de son discours national.
- **Tout inclure** : la mairie noierait le contenu pertinent.

## Conséquences

- Le Choice `role` du classifieur porte cette règle. Le jeu de référence doit
  couvrir chaque cas limite.
