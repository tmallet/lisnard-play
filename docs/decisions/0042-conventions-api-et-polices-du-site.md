---
id: "0042"
title: Conventions de l'API (sérialisation, erreurs) et polices servies par le site
status: accepted
date: 2026-11-25
tags: [architecture, api, security, charte]
supersedes: "0013"
superseded-by: null
related-specs: [api-transport, app-shell]
related-changes: [migrate-web-astro]
---

# 0042 — Conventions de l'API (sérialisation, erreurs) et polices servies par le site

## Contexte

L'ADR 0013 fixait les conventions de l'API tRPC et embarquait Montserrat par
`@expo-google-fonts/montserrat` et `expo-font`. Le site Astro (ADR 0037) n'a plus Expo.

## Décision

- **Conventions de l'API, reprises sans changement** :
  - sérialisation tRPC en JSON simple, sans transformateur : dates en chaînes ISO 8601 ;
  - hors développement, aucune pile d'appels ; une `INTERNAL_SERVER_ERROR` part avec
    le message générique « Erreur interne » ;
  - erreurs volontaires par `TRPCError` avec un code explicite et un message montrable ;
  - erreurs de validation zod aplaties dans `data.zodError`.
  Elles valent aussi pour les appels serveur des pages (`createCaller`) : une page
  traduit `NOT_FOUND` en 404 et n'affiche jamais le détail d'une autre erreur.
- **Polices** : Montserrat (400, 600, 700, 800) vient de `@fontsource/montserrat`,
  **servie par le site** (fichiers `woff2` versionnés par Vite), `font-display: swap`.
  Les images de partage (satori) lisent les fichiers `woff` du même paquet, sous-ensembles
  latin et latin-ext. **Aucun appel à Google Fonts ni à un autre CDN.**
- Les glyphes absents de ces sous-ensembles (« ▶ », emoji) ne sont pas affichés par une
  police de repli : icône SVG dans les pages, image SVG ou suppression dans les images.

## Alternatives écartées

- **Google Fonts** : appel à un tiers à chaque visite (ADR 0022).
- **Fichiers TTF complets d'Expo** : paquet propre à Expo, absent du site.

## Conséquences

- Introduire un transformateur ou une autre politique d'erreurs demande un nouvel ADR.
- Une nouvelle graisse s'ajoute dans `global.css` (`@fontsource`) et dans
  `src/server/images.ts`.
