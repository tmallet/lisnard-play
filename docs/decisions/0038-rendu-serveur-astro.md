---
id: "0038"
title: Rendu de chaque page à chaque requête par Astro, servi sous Bun
status: accepted
date: 2026-11-25
tags: [architecture, web, seo]
supersedes: "0011"
superseded-by: null
related-specs: [app-shell, api-transport, intervention-feed]
related-changes: [migrate-web-astro]
---

# 0038 — Rendu de chaque page à chaque requête par Astro, servi sous Bun

## Contexte

L'ADR 0011 pré-rendait les pages au build (Expo SDK 57), en attendant le SDK 58 pour
rendre chaque page à chaque requête. L'ADR 0037 remplace Expo par Astro : le rendu par
requête est disponible tout de suite. Les interventions arrivent plusieurs fois par
heure, et les directs changent à la minute.

## Décision

- `apps/web` est en `output: 'server'` : **chaque page est rendue à chaque requête**,
  à partir des données à jour, sans reconstruction du site.
- **Adaptateur `@astrojs/node` en mode autonome**, sans son serveur (`ASTRO_NODE_AUTOSTART=disabled`) :
  son gestionnaire (fichiers statiques et pages) est servi par `apps/web/server.mjs`,
  exécuté sous le runtime Bun (`bun --bun`) pour garder `Bun.sql` (ADR 0014).
- `server.mjs` pose `X-Robots-Tag` avant tout traitement (fichiers statiques compris,
  que le middleware d'Astro ne voit pas) et le cache long des fichiers `/_astro/`. Le
  middleware d'Astro pose `X-Robots-Tag` sur les pages et une 404, et un cache court
  (`max-age=60, stale-while-revalidate=300`) sur les pages HTML réussies.
- Le code serveur est **empaqueté avec ses dépendances** (`ssr.noExternal`) ; seuls
  `bun`, resvg (binaire natif) et les polices des images restent des modules à part.
- Les données viennent des procédures tRPC appelées dans le processus (ADR 0037) ; les
  îlots appellent `/api/trpc`, monté dans un endpoint Astro.

## Alternatives écartées

- **Mode `middleware` de l'adaptateur** : il ne sert pas les fichiers statiques et
  passe la main pour les adresses inconnues ; il faudrait réécrire ce que fait le mode
  autonome.
- **Adaptateur Bun communautaire** : non maintenu par l'équipe Astro (ADR 0037).
- **Sortie statique reconstruite à chaque publication** : voir l'ADR 0037.

## Conséquences

- Chaque page servie coûte des lectures en base, indexées ; un cache HTTP pourra
  s'appuyer sur le `Cache-Control` court.
- Les en-têtes qui doivent valoir pour les fichiers statiques se règlent dans
  `server.mjs`, pas dans le middleware.
- Le smoke test vérifie le HTML du build de production, servi par `server.mjs`.
