---
id: "0039"
title: Métadonnées de référencement et contenu des pages rendus par la page elle-même
status: accepted
date: 2026-11-25
tags: [seo, web, partage]
supersedes: "0036"
superseded-by: null
related-specs: [app-shell, intervention-feed]
related-changes: [migrate-web-astro]
---

# 0039 — Métadonnées de référencement et contenu des pages rendus par la page elle-même

## Contexte

L'ADR 0036 réécrivait l'en-tête des pages d'intervention et de l'accueil dans
`server.ts`, et ajoutait le texte dans un `<noscript>`, faute de rendu par requête.
Avec Astro (ADR 0037, 0038), la page rend elle-même son contenu et ses métadonnées.

## Décision

- Chaque page produit son titre, sa description, son adresse canonique, ses balises
  Open Graph et Twitter et ses données structurées (`Seo.astro`, `lib/seo.ts`), sur
  l'adresse de production (`SITE_URL`), jamais sur l'origine de la requête.
- Règles reprises de l'ADR 0036 :
  - intervention : titre daté, description (`lib/intervention-meta.ts`), miniature en
    image (sinon l'icône du site), `VideoObject` pour une vidéo, `WebPage` pour la presse ;
  - accueil : `WebSite` et `Organization`, avec la mention d'indépendance ;
  - presse (ADR 0021) : titre, média et date seulement, jamais de résumé ni de texte
    d'article ;
  - intervention inconnue ou masquée : HTTP 404 ;
  - JSON-LD sérialisé avec `<`, `>` et `&` échappés.
- **Le contenu est dans le corps de la page**, plus dans un `<noscript>` : titre, média,
  date, résumé, points et citations d'une vidéo.
- Une erreur de l'API ne donne jamais une page vide en 200 : 503 pour l'accueil, erreur
  pour une intervention (sinon le moteur indexerait une page vide).
- L'accueil filtré, paginé ou de recherche a pour canonique l'accueil sans paramètre.

## Alternatives écartées

- **Garder la réécriture de l'en-tête** : sans objet avec le rendu par requête, et le
  texte resterait caché aux robots qui ignorent `<noscript>`.

## Conséquences

- Une seule source par titre (la page), au lieu de deux gardées identiques.
- Les pages par thème ne sont pas indexées pour l'instant (canonique de l'accueil) ;
  les rendre indexables demandera un nouvel ADR.
