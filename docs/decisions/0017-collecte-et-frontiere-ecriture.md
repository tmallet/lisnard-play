---
id: "0017"
title: Stratégie de collecte (YouTube RSS + videos.list), lecture d'URL externes et frontière d'écriture
status: accepted
date: 2026-10-13
tags: [ingestion, donnees, security, architecture]
supersedes: null
superseded-by: null
related-specs: [intervention-collection, intervention-media, intervention-feed]
related-changes: [intervention-ingestion]
---

# 0017 — Stratégie de collecte (YouTube RSS + videos.list), lecture d'URL externes et frontière d'écriture

## Contexte

Le change `intervention-ingestion` (design D1, D3 et D6) fixe trois règles
durables. Elles s'appliqueront à chaque nouvelle source et à chaque nouvelle
procédure :
- **collecte YouTube** : l'API de recherche coûte 100 unités par appel, sur
  10 000 par jour ;
- **lecture d'URL externes** par le worker (Open Graph, oEmbed) : risque SSRF ;
- **frontière d'écriture** : le backend et le worker partagent la même base.

## Décision

- **YouTube** : découverte par le **flux RSS public** de chaque chaîne (gratuit,
  sans quota), puis enrichissement et statut de diffusion par **`videos.list`**
  (1 unité pour 50 vidéos au plus). On n'utilise pas `search.list` en collecte
  courante.
- **Lecture d'URL externes** (worker) :
  - seulement des URL issues des sources configurées ou de fournisseurs oEmbed
    en liste blanche ;
  - seulement en `http(s)`, avec refus des IP privées, de la boucle locale et
    des adresses link-local après résolution DNS ;
  - délai de 5 s, réponse limitée à 1 Mo ;
  - de l'oEmbed, on ne garde que l'URL du lecteur, après vérification que son
    hôte appartient au fournisseur. Le HTML tiers n'est jamais stocké.
- **Frontière d'écriture** : `@lisnard/db` expose un point d'entrée `read` et
  un point d'entrée `write`. Le backend (`@lisnard/api`) n'importe que `read`
  et n'expose que les contenus publiés ; seul le worker importe `write`.
- **Journal des classifications** : en ajout seul. Les champs `status`, `role`
  et `kind` de l'élément sont dénormalisés à partir de la dernière décision.

## Alternatives écartées

- **`search.list` YouTube** : 100 unités par appel, intenable à une cadence de
  quelques minutes.
- **Stocker et rendre le HTML oEmbed** : risque d'injection de script.
- **Accès en écriture pour le backend dès maintenant** : rien ne l'exige
  aujourd'hui. Les futurs abonnements aux notifications ouvriront ce point par
  un nouvel ADR.

## Conséquences

- La profondeur de collecte YouTube se limite aux 15 dernières vidéos de chaque
  flux (ADR 0016).
- Une nouvelle source se déclare en configuration et respecte ces règles
  (skill `add-intervention-source`).
- Un import de `write` dans `packages/api` est une erreur de revue.
