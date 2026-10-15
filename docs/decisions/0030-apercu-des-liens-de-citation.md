---
id: "0030"
title: Aperçu des liens de citation par réécriture de l'en-tête dans le serveur, partage sur X par l'adresse publique
status: accepted
date: 2026-10-15
tags: [partage, architecture, web, confidentialite]
supersedes: null
superseded-by: null
related-specs: [intervention-quotes, app-shell]
related-changes: [quote-sharing]
---

# 0030 — Aperçu des liens de citation par réécriture de l'en-tête dans le serveur, partage sur X par l'adresse publique

## Contexte

Les pages sont pré-rendues au build en SDK 57 ; le rendu par requête, et donc les
métadonnées propres à chaque page, arrive avec le SDK 58 (ADR 0011). Les robots
d'aperçu (X, WhatsApp, Facebook) lisent le HTML sans JavaScript : un lien de citation
s'affiche avec un titre générique. L'image de chaque citation existe déjà (ADR 0029).

## Décision

- En attendant le SDK 58, `server.ts` **réécrit l'en-tête HTML des pages de citation**
  qu'il sert (`HTMLRewriter` de Bun). Les données viennent de la citation lue par
  l'API interne :
  - titre et description propres à la citation ;
  - `og:image` et `twitter:image`, une variante paysage 1200 × 630 de l'image ;
  - `og:url` ;
  - `twitter:card` de valeur `summary_large_image`.
- Citation introuvable ou API en erreur : le gabarit est servi sans changement.
- Le partage sur X passe par l'**adresse publique** `x.com/intent/post`, sans script,
  SDK ni compte développeur, conformément à l'absence de traceur (ADR 0022).
- Au passage au SDK 58, cette réécriture sera remplacée par les métadonnées rendues
  par la page elle-même, et cet ADR sera remplacé.

## Alternatives écartées

- **Attendre le SDK 58** : les liens partagés resteraient génériques pendant des mois.
- **Pré-rendre une page par citation** : les citations arrivent chaque jour ; il
  faudrait reconstruire le site à chaque résumé.
- **Bouton ou widget officiel de X** : charge un script tiers qui suit les visiteurs.

## Conséquences

- Chaque page de citation servie coûte une lecture de citation (indexée, à 5 s près).
- Deux sources pour le titre d'une page de citation, le serveur pour les robots et
  `PageHead` pour le navigateur ; elles doivent rester identiques.
- La technique pourra servir aux pages d'intervention dans un change suivant.
