---
id: "0007"
title: Rendu des médias — intégration oEmbed, sinon lien vers la source
status: accepted
date: 2026-10-13
tags: [ingestion, media, ui]
supersedes: null
superseded-by: null
related-specs: []
related-changes: []
---

# 0007 — Rendu des médias : intégration oEmbed, sinon lien vers la source

## Contexte

Les interventions sont hébergées sur des plateformes très diverses : YouTube,
Dailymotion, X, sites de diffuseurs, presse. Certaines permettent
l'intégration, d'autres non. Réhéberger des extraits TV ou radio poserait un
problème de droits.

## Décision

- On **intègre** le lecteur quand l'URL correspond à un fournisseur oEmbed
  connu qui renvoie un type `video` ou `rich` (ex. YouTube, Dailymotion, Vimeo,
  posts X, SoundCloud).
- Sinon, on affiche une **carte de lien** construite à partir des balises Open
  Graph (titre, image, média), qui ouvre la source.
- Le mode de rendu se calcule **à l'ingestion** et se stocke :
  `media: { kind: "embed", provider, embedUrl | html } | { kind: "link", og }`.
  Le front n'a aucune logique propre à une plateforme.
- **Jamais de réhébergement** de contenu audio ou vidéo.

## Alternatives écartées

- **Liste de plateformes codée en dur dans le front** : à maintenir à
  chaque nouvelle source.
- **Téléchargement ou réhébergement** : problème de droits.

## Conséquences

- Instagram et Facebook (oEmbed Meta, qui exige un token d'application)
  s'affichent en carte de lien jusqu'à nouvel ordre.
- Le HTML oEmbed doit être assaini et rendu dans un environnement isolé
  (iframe sur le web, WebView en natif).
