---
id: "0013"
title: Conventions de l'API (sérialisation, erreurs) et polices embarquées
status: accepted
date: 2026-10-13
tags: [architecture, api, securite, charte]
supersedes: null
superseded-by: null
related-specs: [api-transport, app-shell]
related-changes: [setup-foundation]
---

# 0013 — Conventions de l'API (sérialisation, erreurs) et polices embarquées

## Contexte

Le change `setup-foundation` (design D3 et D5) a pris trois décisions techniques
durables que les ADR 0002 et 0012 ne couvraient pas : la sérialisation des
échanges tRPC, la politique d'exposition des erreurs et le mode de chargement de
la police. Elles s'appliquent à toutes les procédures et à tous les écrans à
venir.

## Décision

- **Sérialisation tRPC : JSON simple, sans transformateur** (pas de superjson).
  Les dates circulent en chaînes ISO 8601, et les sorties restent du JSON
  sérialisable tel quel.
- **Erreurs** (`errorFormatter`, `packages/api/src/trpc.ts`) :
  - hors développement, aucune pile d'appels n'est renvoyée ;
  - une erreur `INTERNAL_SERVER_ERROR` est renvoyée avec le message générique
    « Erreur interne », sans son message d'origine ;
  - les erreurs volontaires passent par `TRPCError` avec un code explicite, et
    leur message est conçu pour être montré au client (sans détail interne) ;
  - les erreurs de validation zod sont aplaties dans `data.zodError` pour
    indiquer les champs en cause.
- **Polices embarquées** : Montserrat (ADR 0012) est incluse dans le bundle via
  `@expo-google-fonts/montserrat` et chargée par `expo-font`. **Aucun appel à
  Google Fonts ni à un autre CDN de polices à l'exécution.**

## Alternatives écartées

- **superjson** : `Date`, `Map` et autres types passeraient de façon transparente,
  mais au prix d'une dépendance, d'un format de transport moins lisible et d'un
  couplage du client au transformateur. Le besoin n'existe pas aujourd'hui.
- **Renvoyer les messages d'erreur internes tels quels** : risque de fuite
  d'informations (chemins, requêtes, détails d'infrastructure).
- **Charger Montserrat depuis Google Fonts** : transmet l'adresse IP des
  visiteurs à un tiers et ajoute une dépendance réseau au rendu.

## Conséquences

- Une procédure qui veut transmettre une date la convertit avec `toISOString()`,
  et le client la reparse.
- Introduire un transformateur, ou une autre politique d'erreurs, demande un
  nouvel ADR qui remplace celui-ci.
- Toute nouvelle graisse ou police passe par `src/theme/fonts.ts` et reste
  embarquée.
