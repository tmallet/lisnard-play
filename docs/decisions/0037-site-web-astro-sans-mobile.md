---
id: "0037"
title: Site web seul en Astro rendu par le serveur, abandon définitif du mobile natif
status: accepted
date: 2026-11-25
tags: [architecture, stack, web, seo]
supersedes: "0002"
superseded-by: null
related-specs: [app-shell, api-transport, push-notifications, intervention-feed, intervention-media, intervention-quotes, membership-timeline]
related-changes: [migrate-web-astro]
---

# 0037 — Site web seul en Astro rendu par le serveur, abandon définitif du mobile natif

## Contexte

- L'ADR 0002 a choisi Expo pour servir le web, iOS et Android depuis une même base de
  code. Au 2026-11-25, aucun build mobile n'a été produit : les notifications mobiles
  attendent toujours EAS et les identifiants Apple et FCM (ADR 0024). Le web est le seul
  client réel.
- Le mobile coûte pourtant au quotidien : React Native Web, une quinzaine de variantes
  `.web.tsx`, jest-expo (ADR 0009), le shim Metro et le serveur de développement sous
  Bun (ADR 0019).
- Expo SDK 57 pré-rend les pages au build. Le rendu par requête ne sera stable qu'au
  SDK 58 (ADR 0011). En attendant, `server.ts` réécrit l'en-tête des pages de citation,
  d'intervention et de l'accueil (ADR 0030, 0036), et le texte lisible sans JavaScript se
  limite à un `<noscript>`. Les robots d'IA, qui n'exécutent pas le JavaScript, voient
  des pages presque vides. C'est un frein au référencement dans les moteurs de réponse
  (GEO) comme dans les moteurs classiques.
- Le site est surtout de la lecture : flux, détail, citations, pages fixes.
  L'interactivité se limite à quelques îlots : chargement continu, recherche, lecteur
  après consentement, carte, graphique, notifications, partage.
- Astro 7 (7.4.13 au 2026-11-18, https://docs.astro.build) rend les pages à chaque
  requête avec un adaptateur serveur, sert des endpoints (fichiers, API) et hydrate des
  composants React à la demande (îlots).

## Décision

- **Abandon définitif du mobile natif** : pas d'application iOS ni Android, ni maintenant
  ni plus tard, sous aucune forme (Expo, React Native, Capacitor ou autre). Le site web,
  installable en PWA, est le seul client. Une demande de retour au mobile exige un nouvel
  ADR qui remplace celui-ci.
- **Astro** remplace Expo Router pour l'interface, avec ces choix :
  - **rendu serveur à chaque requête** (`output: 'server'`) ;
  - **adaptateur Node en mode autonome**, exécuté sous le runtime Bun (`bun --bun`) pour
    garder `Bun.sql` (ADR 0014) ;
  - **îlots React** (`@astrojs/react`) seulement pour ce qui exige du JavaScript ;
  - le reste est rendu en HTML et CSS, sans JavaScript client.
- **Lecture sans JavaScript** : toute page est lisible et parcourable sans JavaScript.
  Filtres et pagination passent par l'adresse. Le JavaScript ajoute des fonctions, il
  ne conditionne pas l'accès au contenu.
- **Métadonnées dans la page** : chaque page produit elle-même son titre, sa
  description, sa canonique, ses balises Open Graph et Twitter et son JSON-LD. Plus
  aucune réécriture de l'en-tête après coup.
- **Données** :
  - le rendu serveur appelle les procédures tRPC de `packages/api` en direct, par un
    appel serveur (`createCaller`), avec la même validation et les mêmes règles
    d'exposition ;
  - les îlots appellent `/api/trpc`, monté dans un endpoint Astro ;
  - la frontière d'écriture (ADR 0017) ne change pas.
- **Style** : Tailwind CSS 4 par le plugin Vite. Les tokens de la charte (ADR 0001,
  0012) sont déclarés dans le CSS par `@theme`, comme aujourd'hui.
- **Notifications** : Web Push seulement. Expo Push est retiré de l'API, du worker et
  du schéma.
- **Ce qui ne change pas** : monorepo Bun, tRPC et zod (ADR 0013), worker séparé,
  Postgres et Drizzle, backoffice séparé (ADR 0032), hébergement Coolify (ADR 0015).

```
 Navigateur ──HTML──▶ Astro (SSR, Bun) ──createCaller──▶ packages/api ──▶ Postgres ◀── worker
     └─ îlots React ──/api/trpc──▶ (même service)
```

## Alternatives écartées

- **Garder Expo et attendre le SDK 58** : le SSR arriverait, mais tout le coût du
  multiplateforme resterait pour des plateformes jamais publiées, et le rendu resterait
  React Native Web (balisage peu sémantique, JavaScript lourd).
- **Next.js** : SSR mûr, mais React partout et beaucoup de JavaScript client pour un
  site surtout en lecture. Son hébergement hors Vercel sous Bun est moins direct.
- **Astro en sortie statique, reconstruit à chaque publication** : le worker publie
  plusieurs fois par heure et les directs changent à la minute. Il faudrait des
  reconstructions incessantes, et les endpoints dynamiques (images, API) resteraient
  nécessaires.
- **Adaptateur Bun communautaire pour Astro** : non maintenu par l'équipe Astro.
  L'adaptateur Node officiel fonctionne sous Bun, ce qui suffit.
- **Lire `@lisnard/db/read` directement dans les pages** : on dupliquerait les règles
  d'exposition (interventions masquées, presse) déjà portées par les procédures tRPC.

## Conséquences

- `apps/app` est réécrit en Astro dans `apps/web`, puis supprimé après la bascule
  (change `migrate-web-astro`). Les adresses publiques ne changent pas.
- ADR à remplacer pendant la mise en œuvre, chacun par un nouvel ADR :
  - 0009 : tests du site sous Vitest, à la place de jest-expo ;
  - 0011 : rendu par requête ;
  - 0013 : polices embarquées, sans `expo-font` ;
  - 0015 : image et commande du service web ;
  - 0019 : plus de Metro ;
  - 0024 : Web Push seulement ;
  - 0030 et 0036 : métadonnées rendues par la page. Leurs règles de contenu sont
    reprises, notamment rien de la presse au-delà des métadonnées (ADR 0021).
- `AGENTS.md`, `apps/app/AGENTS.md`, `openspec/config.yaml` (`context`) et les skills
  `charte-ui` et `trpc-procedure` perdent toute consigne propre à Expo ou React Native.
  Les skills Expo du plugin ne s'appliquent plus.
- Chaque page servie déclenche des lectures en base. Les procédures sont indexées, et
  un cache HTTP pourra s'ajouter si la charge l'exige.
- Les notifications sur iPhone exigent l'installation du site sur l'écran d'accueil.
  Cette limite d'iOS est acceptée et déjà expliquée à l'écran (spec `push-notifications`).
