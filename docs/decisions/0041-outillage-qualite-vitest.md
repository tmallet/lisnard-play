---
id: "0041"
title: Outillage qualité — Biome, bun test, Vitest pour le site, smoke test web et contrôle de parité
status: accepted
date: 2026-11-25
tags: [outillage, qualite, ci]
supersedes: "0009"
superseded-by: null
related-specs: [app-shell, api-transport]
related-changes: [migrate-web-astro]
---

# 0041 — Outillage qualité : Biome, bun test, Vitest pour le site, smoke test web et parité

## Contexte

L'ADR 0009 testait `apps/app` avec jest-expo, le runner de Bun ne gérant pas React
Native. Le site Astro (`apps/web`, ADR 0037) n'a plus de React Native, mais ses
composants `.astro` exigent Vite pour être rendus en test.

## Décision

- Repris de l'ADR 0009 : **Biome** (lint et format, `biome.json`), **`tsc` strict** par
  workspace, **`bun test`** pour `packages/*`, `apps/worker` et `apps/admin`,
  **`docs:check`**, point d'entrée unique **`bun run check`**, et **GitHub Actions** qui
  lance `bun run check` puis le smoke test sur chaque PR et sur `main`.
- **`apps/web` : Vitest**, sur la configuration Vite d'Astro (`getViteConfig`) :
  - modules purs ;
  - composants `.astro` par l'API Container d'Astro ;
  - îlots React avec Testing Library sous happy-dom, API simulée par `fakeApi()` ;
  - types vérifiés par `astro check`.
- **jest-expo** reste pour `apps/app` jusqu'à son retrait.
- **Smoke test web** : build de production d'`apps/web`, `server.mjs`, base jetable ;
  vérifie par HTTP, sans JavaScript, le contenu hors `<noscript>`, la pagination, les
  redirections, les métadonnées et les en-têtes.
- **Contrôle de parité** avant une bascule de service (`scripts/parity-web.ts`).
- Biome ne lit que le préambule des fichiers `.astro` : les règles d'imports et de
  variables inutilisés y sont coupées (`overrides` de `biome.json`).

## Alternatives écartées

- **`bun test` pour le site** : ne rend pas les composants `.astro` (pas de Vite).
- **Playwright dans la CI dès maintenant** : le smoke test HTTP et les tests d'îlots
  couvrent les exigences ; les parcours dans un navigateur restent ponctuels.

## Conséquences

- Trois runners coexistent jusqu'au retrait d'`apps/app`, puis deux.
