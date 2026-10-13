---
id: "0016"
title: Début de l'historique — 31 mars 2026, annonce de candidature
status: accepted
date: 2026-10-13
tags: [produit, perimetre, ingestion]
supersedes: null
superseded-by: null
related-specs: []
related-changes: [intervention-ingestion]
---

# 0016 — Début de l'historique : 31 mars 2026, annonce de candidature

## Contexte

L'ADR 0005 laissait ouverte la date de début de l'historique (« antérieure à
la déclaration de candidature du 31 mars 2026, à préciser »). Le porteur du
projet a choisi la **date de début de campagne**. David Lisnard a annoncé sa
candidature et quitté Les Républicains le 31 mars 2026 (Public Sénat).

## Décision

- L'historique commence le **31 mars 2026 à 00:00, heure de Paris**
  (`2026-03-30T22:00:00Z`).
- Un contenu dont la date (diffusion, sinon publication) est antérieure à ce
  seuil n'est **pas collecté**. S'il est déjà en base, il n'est pas publié.
- La date est une **constante de configuration du worker**
  (`HISTORY_START`), et non une valeur codée en dur dans plusieurs fichiers.

## Alternatives écartées

- **Date du premier meeting (Saint-Raphaël)** : date exacte non établie, et
  l'annonce du 31 mars est le point de départ officiel.
- **Remonter avant la candidature** : contredit le choix du porteur du projet,
  et la pertinence « campagne » serait plus difficile à trancher.

## Conséquences

- Le rattrapage initial couvre environ six mois et demi, dans la limite de ce
  que chaque source expose (un flux RSS YouTube ne remonte que ses 15 dernières
  vidéos, par exemple). Le rattrapage profond, par recherche ou par archives,
  est un sujet à part.
- Ce seuil tranche le point ouvert de l'ADR 0005.
