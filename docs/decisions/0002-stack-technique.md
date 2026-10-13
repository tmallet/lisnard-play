---
id: "0002"
title: Stack technique — Expo, Bun, tRPC, Uniwind
status: accepted
date: 2026-10-13
tags: [architecture, stack]
supersedes: null
superseded-by: null
related-specs: []
related-changes: []
---

# 0002 — Stack technique : Expo, Bun, tRPC, Uniwind

## Contexte

Une seule base de code doit servir le web, iOS et Android, avec un typage de
bout en bout entre le front et le back.

## Décision

- **Expo** (dernière version du SDK) avec **Expo Router** pour web, iOS et Android.
- **Bun** comme gestionnaire de paquets et pour les workspaces du monorepo,
  et comme runtime du worker d'ingestion (ADR 0003, remplacé par 0011).
- **tRPC** pour la communication front/back, avec des entrées validées par zod.
- **Uniwind** (Tailwind v4 pour React Native, configuration dans le CSS via
  `@theme`) pour le style. Les tokens de l'ADR 0001 y sont déclarés.
- Organisation cible du monorepo :

  ```
  apps/app        Expo Router (UI + API routes tRPC)
  apps/worker     ingestion + classification (Bun)
  packages/api    routeur tRPC partagé
  packages/db     schéma + client de base de données
  ```

## Alternatives écartées

- **REST/OpenAPI** : plus verbeux, sans gain puisque le client et le serveur
  sont en TypeScript dans le même dépôt.
- **NativeWind** : Uniwind est préféré pour son alignement sur Tailwind v4.

## Conséquences

- Les API routes Expo ne tournent pas forcément sous le runtime Bun (cela
  dépend de l'hébergement). Bun n'y est garanti que pour le worker et l'outillage.
- Le choix de la base de données reste ouvert.

## Points ouverts

- Base de données : Postgres ou SQLite/Turso.
- Hébergement des API routes (EAS Hosting ou autre).
