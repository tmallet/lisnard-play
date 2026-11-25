---
id: "0044"
title: Serveur de développement Astro sous le runtime Bun et connexion Postgres partagée
status: accepted
date: 2026-11-25
tags: [architecture, outillage, donnees, api]
supersedes: "0019"
superseded-by: null
related-specs: [api-transport]
related-changes: [migrate-web-astro]
---

# 0044 — Serveur de développement Astro sous le runtime Bun et connexion Postgres partagée

## Contexte

L'ADR 0019 faisait tourner Metro sous Bun, avec un shim pour le module `bun`, et gardait
la connexion Postgres sur `globalThis`. Le site Astro (ADR 0037) utilise Vite, qui laisse
le module `bun` au runtime quand il est déclaré externe.

## Décision

- **Runtime Bun partout** : `bun run dev:web` lance `bun --env-file=../../.env --bun
  astro dev`, le build passe par `bun --bun astro build`, la production par
  `bun --bun server.mjs`. Le `.env` racine reste la seule source des variables en local.
- **Module `bun`** déclaré externe à Vite (`vite.ssr.external`) : plus de shim.
- **Connexion partagée**, reprise de l'ADR 0019 : le client Postgres est créé à la
  première requête et gardé sur `globalThis.__lisnardDb` (pool `max: 5`,
  `idleTimeout: 30` s), car Vite réévalue les modules au rechargement. Sans
  `DATABASE_URL`, les procédures de données échouent proprement.

## Alternatives écartées

- **Driver `postgres` ou `pg`** : voir l'ADR 0019, inchangé.

## Conséquences

- Toute commande qui exécute le code serveur (développement, build, tests de pages,
  smoke test, production) tourne sous Bun.
- Le shim Metro (`apps/app/shims/bun.js`) disparaît avec `apps/app`.
