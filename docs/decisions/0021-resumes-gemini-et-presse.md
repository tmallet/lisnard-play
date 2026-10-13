---
id: "0021"
title: Résumés des vidéos par Gemini via OpenRouter, sans résumé des articles de presse
status: accepted
date: 2026-10-13
tags: [ia, ingestion, media, juridique]
supersedes: null
superseded-by: null
related-specs: [intervention-summaries, intervention-media, intervention-feed]
related-changes: [intervention-summaries]
---

# 0021 — Résumés des vidéos par Gemini via OpenRouter, sans résumé des articles de presse

## Contexte

Le porteur du projet veut un résumé en tête de l'écran de détail. Deux cas se
présentent :
- **les vidéos YouTube**, qui forment l'essentiel des interventions publiées
  (chaîne officielle et chaînes de médias) ;
- **les articles de presse** relayés par Google News.

Jev (ADR 0004) ne produit pas de texte. Il faut donc un modèle génératif capable
de lire une vidéo.

**Essai du 2026-10-13** : `google/gemini-3.5-flash-lite` via OpenRouter
(`/api/v1/chat/completions`, contenu `video_url` avec une URL YouTube, servie
par le fournisseur Google AI Studio), avec la clé OpenRouter déjà en place.

| Vidéo | Durée de traitement | Coût |
|-------|---------------------|------|
| Clip | 4,7 s | 0,002 $ |
| Débat complet | 35 s | 0,10 $ |

Dans les deux cas, le résumé est fidèle et factuel.

En France, les éditeurs de presse disposent d'un droit voisin sur leurs
publications (code de la propriété intellectuelle, article L218-2). Récupérer le
texte d'un article pour en produire un résumé automatique exposerait le projet.

## Décision

- **Résumés des vidéos uniquement** :
  - le modèle est `google/gemini-3.5-flash-lite`, épinglé, appelé via
    OpenRouter et restreint au fournisseur Google AI Studio, le seul qui accepte
    les URL YouTube ;
  - la consigne est versionnée et la sortie structurée en JSON : résumé de
    3 phrases au plus, 2 à 4 points clés, et un indicateur « David Lisnard
    s'exprime » ;
  - chaque résumé est stocké avec le modèle et la version de la consigne.
- **Jev reste le seul juge de la publication.** Le résumé n'influence ni la
  publication ni les thèmes (ADR 0018, 0020).
- **Affichage** : le résumé porte toujours la mention « Résumé généré
  automatiquement ». S'il est absent (direct en cours, échec, David Lisnard ne
  s'exprime pas), rien ne s'affiche.
- **Garde-fous de coût** : plafond quotidien de dépense, nombre limité de
  résumés par cycle, plafond de tentatives par contenu.
- **Presse** :
  - aucun texte d'article n'est récupéré ni résumé ;
  - le lien Google News est résolu vers l'URL de l'éditeur ;
  - seules les balises Open Graph de l'en-tête de la page sont lues : image,
    accroche et nom du site, que l'éditeur publie pour le partage ;
  - le lien « source » pointe vers l'éditeur.
- **Lecture d'URL externes** : toujours par la lecture sécurisée de l'ADR 0017.
  Le décodage des liens Google News passe par son point d'accès
  `batchexecute`, dans les mêmes conditions.

## Alternatives écartées

- **Clé Gemini directe (Google AI Studio)** : une clé et une facturation de
  plus. OpenRouter suffit et garde un seul fournisseur côté worker (ADR 0004).
- **Transcription YouTube puis résumé par un modèle texte** : il n'existe pas
  d'API officielle pour les sous-titres de vidéos tierces sans OAuth du
  propriétaire.
- **Résumer les articles à partir de leur texte** : droit voisin, et pages
  souvent payantes.
- **Modèle plus puissant (Pro)** : 5 à 10 fois plus cher, pour un gain inutile
  sur des résumés de 3 phrases.

## Conséquences

- Un second modèle tourne dans le worker, avec sa propre épingle et sa propre
  consigne versionnée. Le skill `classifier-jev` ne le couvre pas : le
  documenter dans `docs/architecture/`.
- `OPENROUTER_API_KEY` sert désormais aussi aux résumés. Elle reste réservée au
  worker.
- Le décodage des liens Google News repose sur un point d'accès non documenté.
  En cas de rupture, le rendu revient au lien minimal (spec
  `intervention-media`) sans bloquer la publication.
