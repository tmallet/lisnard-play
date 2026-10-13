---
id: "0003"
title: Web d'abord, API routes tRPC et worker d'ingestion séparé
status: superseded
date: 2026-10-13
tags: [architecture, web, ingestion]
supersedes: null
superseded-by: "0011"
related-specs: []
related-changes: []
---

# 0003 — Web d'abord, API routes tRPC et worker d'ingestion séparé

## Contexte

Le web apporte le référencement et le partage de liens vers une intervention.
Le mobile apporte les notifications (ADR 0005). L'ingestion est périodique,
alors que des API routes serverless ne peuvent pas s'exécuter en tâche planifiée.

## Décision

- **Web d'abord** : Expo Router en sortie serveur (SSR), avec des balises meta
  et Open Graph par intervention pour que chaque page soit partageable.
- Le **routeur tRPC** est servi par une API route Expo
  (`app/api/trpc/[trpc]+api.ts`) dans `apps/app`.
- Un **worker séparé** (`apps/worker`, runtime Bun) exécute en tâche
  planifiée la collecte, la classification et la publication. Il écrit en base,
  et l'application lit via tRPC.

```
 Expo (web/iOS/Android) ──tRPC──▶ API routes ──▶ base de données ◀── worker (cron)
```

## Alternatives écartées

- **Serveur Bun unique (Hono/Elysia) pour l'API et le cron** : un service de
  plus à héberger, et on perd le SSR intégré d'Expo Router pour l'API.
- **Mobile d'abord** : moins bon pour la découverte et le partage.

## Conséquences

- Deux unités déployables : l'application (web + API) et le worker.
- Les secrets d'ingestion (`OPENROUTER_API_KEY`, clé YouTube) ne résident que
  côté worker.
- Les notifications web (Web Push) sur iOS exigent que la PWA soit installée
  sur l'écran d'accueil. Le natif reste le canal principal des alertes.

## Points ouverts

- Mécanisme de planification du worker (cron d'hébergeur, déclencheur externe).
