---
id: "0009"
title: Outillage qualité — Biome, bun test, jest-expo, smoke test web, GitHub Actions
status: proposed
date: 2026-10-13
tags: [outillage, qualite, ci]
supersedes: null
superseded-by: null
related-specs: [app-shell, api-transport]
related-changes: [setup-foundation]
---

# 0009 — Outillage qualité : Biome, bun test, jest-expo, smoke test web, GitHub Actions

## Contexte

Le monorepo (ADR 0002) mélange du code TypeScript pur (`packages/*`) et du
code React Native/Expo (`apps/app`). Les agents de codage ont besoin de
commandes de vérification uniques, rapides et déterministes. La
documentation fait partie de ce qui est vérifié (ADR 0008).

## Décision

- **Lint et format** : Biome, un seul outil et une seule config à la racine
  (`biome.json`).
- **Types** : `tsc --noEmit` par workspace, configuration stricte partagée
  (`tsconfig.base.json`).
- **Tests** :
  - `packages/*` : `bun test` ;
  - `apps/app` : `jest-expo` + React Native Testing Library (le runner de Bun
    ne gère pas l'environnement React Native) ;
  - **smoke test web** : export de production, serveur local, requêtes HTTP
    sans JavaScript pour vérifier le SSR, les métadonnées et l'API.
- **Contrôle de la doc** : `bun run docs:check` (ADR 0008).
- **Point d'entrée unique** : `bun run check` enchaîne format, lint, types,
  tests et `docs:check`. C'est la commande que les agents lancent avant de
  conclure une tâche.
- **CI** : GitHub Actions, sur chaque PR et sur `main`, exécute `bun run check`
  puis le smoke test web.

## Alternatives écartées

- **ESLint + Prettier (avec eslint-config-expo)** : deux outils et plus de
  configuration, et nettement plus lents. On perd les règles spécifiques à
  Expo, perte jugée acceptable à ce stade.
- **Jest partout** : plus lent que `bun test` pour le code non React Native.
- **Tests de bout en bout dans un navigateur (Playwright) dès maintenant** :
  disproportionné pour une coquille. Le smoke test HTTP couvre les exigences
  actuelles.

## Conséquences

- Deux runners de tests coexistent, chacun limité à son périmètre.
- Si des règles de lint propres à Expo deviennent nécessaires, un ADR
  remplacera celui-ci.

## Points ouverts

- Passer à `accepted` à la validation du change `setup-foundation`.
