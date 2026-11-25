---
id: "0043"
title: Hébergement — conteneurs Docker sur Coolify, site Astro servi sous Bun
status: accepted
date: 2026-11-25
tags: [architecture, hebergement, deploiement]
supersedes: "0015"
superseded-by: null
related-specs: []
related-changes: [migrate-web-astro]
---

# 0043 — Hébergement : conteneurs Docker sur Coolify, site Astro servi sous Bun

## Contexte

L'ADR 0015 servait l'export Expo par l'adaptateur Bun d'`expo-server`, et prévoyait que
les clients mobiles appellent l'API. Le site Astro (ADR 0037, 0038) remplace l'app, et
il n'y a plus de client mobile.

## Décision

- Services Coolify, sur un hôte :
  - `web` : image `apps/web/Dockerfile`, build Astro servi par `bun --bun server.mjs`
    (pages, API tRPC, images de partage, relais `/admin`). Seul service web exposé.
    Il remplace `app` à la bascule du domaine (procédure dans
    `docs/architecture/deploiement.md`) ;
  - `worker` : ingestion, processus long, non exposé hors l'adresse WebSub (ADR 0023) ;
  - `admin` : backoffice, joint par le réseau interne (ADR 0032) ;
  - `postgres` : réseau interne seulement (ADR 0014).
- Repris de l'ADR 0015 :
  - **Bun est le runtime** du site et du worker (`Bun.sql`) ;
  - **un Dockerfile par service**, construit depuis la racine du monorepo, version de
    Bun lue dans `.tool-versions` (vérifiée par `docs:check`) ;
  - **configuration par variables d'environnement** saisies dans Coolify, aucun secret
    dans les images ;
  - **migrations** appliquées par le worker au démarrage ;
  - **planification interne** du worker, avec verrou Postgres (advisory lock).
- Image du site : Bun « slim », le build (code serveur empaqueté avec ses
  dépendances), `server.mjs`, resvg et les polices des images ; point de santé
  `GET /api/trpc/health`.
- `SITE_URL` donne l'adresse de production (canoniques, aperçus, pied des images).

## Alternatives écartées

- **Hébergement serverless** : le worker exige un processus long (ADR 0015) ; le site
  garde le même hôte pour rester près de Postgres.

## Conséquences

- Tant que la bascule n'est pas faite, `app` et `web` coexistent ; `app` est supprimé
  après deux semaines d'observation (change `migrate-web-astro`).
- Chaque Dockerfile copie le `package.json` de chaque workspace avant
  `bun install --frozen-lockfile`.
