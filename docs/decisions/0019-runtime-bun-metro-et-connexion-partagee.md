---
id: "0019"
title: Serveur de développement sous le runtime Bun, shim Metro `bun` et connexion Postgres partagée
status: accepted
date: 2026-10-13
tags: [architecture, outillage, donnees, api]
supersedes: null
superseded-by: null
related-specs: [intervention-feed, api-transport]
related-changes: [intervention-ingestion]
---

# 0019 — Serveur de développement sous le runtime Bun, shim Metro `bun` et connexion Postgres partagée

## Contexte

Les API routes d'Expo importent `@lisnard/db`, qui s'appuie sur le driver
`Bun.sql` (ADR 0014). En production, elles tournent dans le serveur Bun
(`apps/app/server.ts`, ADR 0015). Pendant l'implémentation (2026-10-13), trois
problèmes sont apparus :

- **Empaquetage** : Metro ne connaît pas le module natif `bun` et échoue avec
  « Unable to resolve module bun ».
- **Runtime de développement** : `expo start` tourne par défaut sous Node, où
  `Bun.sql` n'existe pas.
- **Connexions** : Metro réévalue le module de l'API route à chaque
  rechargement. Chaque évaluation créait un pool, jusqu'à l'erreur Postgres
  « too many clients ».

## Décision

- **Shim Metro** : `apps/app/metro.config.js` résout le module `bun` vers
  `apps/app/shims/bun.js`, qui exporte `globalThis.Bun`. Le code reste écrit
  avec `import { SQL } from 'bun'`.
- **Serveur de développement sous Bun** : `bun run dev` lance
  `bun --env-file=../../.env --bun expo start`. Le `.env` racine est la seule
  source des variables en local.
- **Connexion partagée** : l'API route crée le client Postgres à la première
  requête et le garde sur `globalThis.__lisnardDb`. Le pool est plafonné
  (`max: 5`, `idleTimeout: 30` s). Sans `DATABASE_URL`, le contexte ne porte
  pas de base et les procédures de données échouent proprement.

## Alternatives écartées

- **Driver `postgres` (porsager) ou `pg`** : fonctionne sous Node et Bun, mais
  ajoute une dépendance et deux drivers à maintenir face au worker (ADR 0014).
- **Serveur d'API séparé de l'app** : un processus de plus à déployer, alors
  que les API routes suffisent (ADR 0003, 0011).
- **Pool créé à chaque requête** : coût de connexion à chaque appel, sans
  régler la réévaluation des modules.

## Conséquences

- Toute commande qui exécute les API routes (développement, smoke test,
  production) doit tourner sous Bun.
- Un nouveau module importé côté serveur qui dépend de `bun` passe par le shim :
  ne pas l'importer depuis du code client.
- Tout état serveur coûteux (connexions, caches) se conserve sur `globalThis`
  pour survivre aux rechargements de développement.
