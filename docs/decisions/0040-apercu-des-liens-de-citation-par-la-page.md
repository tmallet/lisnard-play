---
id: "0040"
title: Aperçu des liens de citation rendu par la page, redirection d'une citation changée, partage sur X par l'adresse publique
status: accepted
date: 2026-11-25
tags: [partage, web, confidentialite]
supersedes: "0030"
superseded-by: null
related-specs: [intervention-quotes, app-shell]
related-changes: [migrate-web-astro]
---

# 0040 — Aperçu des liens de citation rendu par la page, redirection d'une citation changée, partage sur X

## Contexte

L'ADR 0030 réécrivait l'en-tête des pages de citation dans `server.ts` pour les robots
d'aperçu (X, WhatsApp, Facebook), et ouvrait la rédaction native de l'app X sur iOS.
Le site Astro rend chaque page à chaque requête (ADR 0038) et n'a plus d'app iOS
(ADR 0037).

## Décision

- La page d'une citation rend elle-même ses balises d'aperçu : titre et description
  propres à la citation (`lib/quote-meta.ts`), `og:image` et `twitter:image` vers la
  variante paysage 1200 × 630, adresse versionnée par le texte (`?v=`), `og:url` et
  canonique sur le domaine de production, `twitter:card` `summary_large_image`.
- **Citation introuvable à ce minutage** (résumé régénéré) : redirection HTTP 302 vers
  l'intervention au même moment (`/interventions/<id>?t=<s>`). Minutage illisible :
  redirection vers l'intervention.
- **Partage sur X** : adresse publique `twitter.com/intent/tweet`, que l'app X ouvre
  elle-même sur téléphone. Aucun script, SDK ni compte développeur (ADR 0022). Le
  schéma `twitter://` disparaît avec l'app iOS.

## Alternatives écartées

- **Servir une page générique en 200 pour une citation disparue** (comportement de
  l'ADR 0030) : une page mince de plus pour les moteurs ; la redirection mène au contenu.

## Conséquences

- Chaque page de citation coûte deux lectures (citation et intervention).
- Les liens déjà partagés vers une citation régénérée mènent à l'intervention.
