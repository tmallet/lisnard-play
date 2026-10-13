---
id: "0011"
title: Web d'abord — pré-rendu et API routes en SDK 57, SSR à la montée en SDK 58
status: accepted
date: 2026-10-13
tags: [architecture, web, ingestion]
supersedes: "0003"
superseded-by: null
related-specs: [app-shell, api-transport]
related-changes: [setup-foundation]
---

# 0011 — Web d'abord : pré-rendu et API routes en SDK 57, SSR à la montée en SDK 58

## Contexte

L'ADR 0003 prévoyait un rendu serveur (SSR) des pages via `web.output: "server"`.
À l'implémentation (SDK Expo 57, dernière version stable au 2026-10-13), on
constate ce qui suit :
- en SDK 57, `web.output: "server"` **pré-rend** les pages au build (HTML
  complet dans `dist/server/*.html`) et sert les API routes. Vérifié par
  `expo export` + `expo serve` : le HTML contient le contenu sans JavaScript
  et `/api/*` répond ;
- le vrai SSR (rendu à chaque requête) n'est stable qu'à partir du SDK 58. En
  SDK 55 à 57, il exige le drapeau `unstable_useServerRendering`
  (https://docs.expo.dev/router/web/server-rendering).

## Décision

Ce qui reprend l'ADR 0003 sans changement :
- **web d'abord** ;
- **tRPC servi par une API route Expo** (`src/app/api/trpc/[trpc]+api.ts`) ;
- **worker d'ingestion séparé** (`apps/worker`, runtime Bun), qui écrit en
  base pendant que l'application lit via tRPC ;
- les secrets d'ingestion ne résident que côté worker.

Ce qui change :
- En SDK 57, on utilise `web.output: "server"`, c'est-à-dire **pré-rendu au
  build + API routes**. On n'active **pas** `unstable_useServerRendering`.
- Les métadonnées et la mention d'indépendance sont présentes dans le HTML
  pré-rendu, ce qui satisfait les exigences de la spec `app-shell`.
- **À la montée en SDK 58**, on passera au SSR stable (`web.output: "server"`,
  nouvelle sémantique). Ce sera nécessaire pour les pages dynamiques
  d'intervention, avec leurs métadonnées par page.

```
 Expo (web/iOS/Android) ──tRPC──▶ API routes ──▶ base de données ◀── worker (cron)
          │
          └─ web : HTML pré-rendu au build (SDK 57) → SSR par requête (SDK 58+)
```

## Alternatives écartées

- **Activer `unstable_useServerRendering` en SDK 57** : API instable, déconseillée
  en production.
- **`web.output: "static"`** : pas d'API routes, ce qui contredit le montage
  tRPC.

## Conséquences

- Tant qu'on est en SDK 57, une page dynamique (ex. `/interventions/[id]`)
  devra être pré-rendue via `generateStaticParams`, ou bien rendue côté client
  avec des métadonnées génériques. La montée en SDK 58 devient un prérequis
  du partage riche des interventions.
- Le smoke test web vérifie le HTML servi par `expo serve`. Il reste valable
  après le passage au SSR.
