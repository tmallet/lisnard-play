---
id: "0031"
title: Récapitulatifs du jour et de la semaine, citation la plus marquante notée par Jev, publication manuelle sur X
status: accepted
date: 2026-10-16
tags: [produit, ia, partage, donnees]
supersedes: null
superseded-by: null
related-specs: [campaign-recaps]
related-changes: [campaign-recaps]
---

# 0031 — Récapitulatifs du jour et de la semaine, citation la plus marquante notée par Jev, publication manuelle sur X

## Contexte

Le compte X de Lisnard Play veut publier chaque jour et chaque semaine un résumé qui
mène au site. Il faut y mettre en avant la citation la plus marquante, sans appeler un
modèle à chaque affichage, et sans écrire en base hors du worker (ADR 0017).

## Décision

- **Note « marquante » par citation** : le worker pose à Jev (ADR 0004, modèle épinglé)
  une question vrai/faux par citation, une fois par version de la question, et garde la
  probabilité en base (`quote.striking`, `quote.striking_version`). Les récapitulatifs
  prennent la citation de plus haute note de la période, sans appel au modèle.
- **Périodes** : le jour (heure de Paris), s'il compte au moins une intervention, et la
  semaine du lundi au dimanche.
- **Contenu** : interventions et médias, lieux, citation mise en avant ; adhésions lues
  par l'API comme le graphique (ADR 0026), sans copie en base.
- **Partage** : page Campagne à `?jour=` / `?semaine=`, image paysage et en-tête
  réécrit par le serveur (ADR 0029, 0030). La publication sur X est **manuelle**, par
  l'adresse de partage publique de X.

## Alternatives écartées

- **Choisir la citation parmi celles de la période (question à choix)** : appel à
  refaire pour chaque période et à chaque nouvelle vidéo ; la note par citation sert à
  tout.
- **Faire choisir Gemini au moment du résumé** : mélange deux rôles dans la consigne du
  résumé et oblige à régénérer l'historique pour changer de critère.
- **Publication automatique par l'API de X** : compte développeur, clés à garder,
  publication sans relecture d'une citation issue d'une transcription automatique ;
  repoussée.

## Conséquences

- Un appel Jev par citation (une fois), dans le cycle du worker ; une commande de
  rattrapage pour l'historique.
- Changer le texte de la question impose d'incrémenter `STRIKING_VERSION` (les notes sont
  alors recalculées au fil des cycles).
- La page Campagne gagne une vue « Récaps » et deux paramètres d'adresse.
