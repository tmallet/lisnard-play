---
id: "0029"
title: Image de partage d'une citation produite par le serveur (satori et resvg)
status: accepted
date: 2026-10-15
tags: [ui, partage, architecture, dependance]
supersedes: null
superseded-by: null
related-specs: [intervention-quotes]
related-changes: [quote-image]
---

# 0029 — Image de partage d'une citation produite par le serveur (satori et resvg)

## Contexte

On veut partager une citation sous forme d'image sur les réseaux sociaux. L'image
doit être la même sur le web, iOS et Android, respecter la charte d'indépendance
(ADR 0001) et ne reproduire aucun visuel tiers (ADR 0007). Les API routes sont
empaquetées par Metro, qui n'embarque pas de module natif ; le serveur de production
est un programme Bun (ADR 0015).

## Décision

- L'image est produite **par le serveur** à
  `/interventions/<id>/citation/<secondes>/image.png`, servie par `server.ts`, hors
  Metro.
- **Rendu** :
  - **satori** met en page la citation en SVG, avec les polices Montserrat déjà
    installées ;
  - **@resvg/resvg-js** convertit le SVG en PNG ;
  - aucun service tiers ni appel payant.
- **Contenu** :
  - format carré 1080 × 1080, palette de la charte, modèle « encadré » ;
  - la citation, « David Lisnard », le média, la date, le thème, le minutage situé
    sur la durée de la vidéo, le nom et l'adresse du site, la mention d'indépendance ;
  - jamais de logo, de photo ni de miniature de vidéo.
- **Cache** : mémoire (200 images) et navigateur (24 h), indexé par le texte et le
  minutage ; une citation inconnue répond 404 sans calcul.

## Alternatives écartées

- **Capture d'une vue côté client** (react-native-view-shot, canvas) : deux
  implémentations aux rendus inégaux, et l'image ne pourrait pas servir d'`og:image`.
- **Service d'images tiers** : envoi de données à un tiers, dépendance externe.
- **Module WebAssembly de resvg** : plus lent ; gardé en repli si le binaire natif
  posait problème dans l'image Docker.

## Conséquences

- Nouvelles dépendances de l'app : `satori`, `@resvg/resvg-js`, `expo-sharing`,
  `expo-file-system`.
- L'image Docker reçoit le module d'image empaqueté, le binaire de resvg et quatre
  graisses de Montserrat ; la citation est lue par l'API interne, sans accès direct à la base depuis
  `server.ts`.
- L'image n'existe qu'avec le serveur de production : en développement, on la vérifie
  avec `server.ts` après un export, comme le smoke test.
- L'adresse de l'image pourra servir d'`og:image` quand les pages seront rendues à la
  demande (SDK 58).
