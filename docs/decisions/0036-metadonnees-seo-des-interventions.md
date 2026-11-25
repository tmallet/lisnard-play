---
id: "0036"
title: Métadonnées de référencement des interventions et de l'accueil par réécriture de l'en-tête
status: superseded
date: 2026-11-24
tags: [seo, architecture, web, partage]
supersedes: null
superseded-by: "0039"
related-specs: [app-shell]
related-changes: [seo-interventions]
---

# 0036 — Métadonnées de référencement des interventions et de l'accueil par réécriture de l'en-tête

## Contexte

Le plan du site liste ~1 770 pages d'intervention servies avec le même gabarit : même
titre, même description, même H1, ni canonique ni JSON-LD. Les moteurs y voient des
quasi-doublons et les robots d'IA, sans JavaScript, des pages vides. Le SSR n'arrive
qu'avec le SDK 58 (ADR 0011) ; l'ADR 0030 le contourne déjà pour les citations.

## Décision

- `server.ts` réécrit l'en-tête des pages `/interventions/<id>` et de l'accueil, avec la
  technique de l'ADR 0030 (`withPageMeta`) : titre daté, description, `link rel=canonical`,
  Open Graph, carte Twitter et JSON-LD (`VideoObject` ou `WebPage`, `WebSite` et
  `Organization` pour l'accueil), tous sur le domaine de production et échappés.
- Le titre et la description viennent de `lib/intervention-meta.ts`, partagé avec `PageHead`.
- Le titre, la description et, pour une vidéo seulement, le résumé sont aussi ajoutés dans
  un `<noscript>` en fin de `<body>`, lisible sans JavaScript.
- Presse (ADR 0021) : métadonnées seulement (titre, média, date) ; aucun résumé ni texte
  d'article, ni dans la description, ni dans le JSON-LD, ni dans le texte.
- Intervention inconnue ou masquée : HTTP 404 ; API en erreur : gabarit inchangé en 200.
- Au passage au SDK 58, ces métadonnées passeront dans les pages et cet ADR sera remplacé.

## Alternatives écartées

- **Attendre le SDK 58** : 1 770 pages resteraient des doublons pendant des mois.
- **Pré-rendre une page par intervention** : il faudrait reconstruire le site à chaque ajout.
- **Retirer les interventions du plan du site** : elles sont le contenu du site.

## Conséquences

- Chaque page d'intervention servie coûte une lecture (indexée), comme une citation.
- Deux sources pour le titre (serveur et `PageHead`), gardées identiques par un module commun.
- Une intervention masquée n'est plus servie en 200 : elle sort de l'index.
