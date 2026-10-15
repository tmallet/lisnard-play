---
id: "0028"
title: Citations horodatées extraites avec le résumé, recherche plein texte dans Postgres, page par citation
status: accepted
date: 2026-10-15
tags: [ia, donnees, ui, recherche]
supersedes: null
superseded-by: null
related-specs: [intervention-quotes, intervention-summaries, intervention-feed]
related-changes: [video-quotes]
---

# 0028 — Citations horodatées extraites avec le résumé, recherche plein texte dans Postgres, page par citation

## Contexte

On veut retrouver ce que David Lisnard a dit sur un sujet, avec le passage exact de
la vidéo. Gemini lit déjà chaque vidéo pour la résumer (ADR 0021). Il faut des
citations fidèles et minutées, une recherche en français insensible aux accents, et
des liens partageables vers un passage.

## Décision

- **Citations produites dans l'appel du résumé** : consigne en version 4, de 3 à 8
  citations par vidéo, avec ses mots, leur minutage et un thème. Une seule lecture
  de chaque vidéo ; une régénération unique de l'historique, d'environ 5 $.
- **Vidéos seulement** : jamais le texte d'un article (ADR 0021).
- **Mention « transcription automatique »** sur chaque citation, et un bouton pour
  écouter le passage dans le lecteur officiel (ADR 0007, 0022), sans réhébergement.
- **Recherche plein texte dans Postgres** : configuration `french`, avec un texte
  normalisé (minuscules, sans accents) par une fonction SQL immuable plutôt que par
  l'extension `unaccent`. Index GIN sur les citations, et sur les titres et résumés.
- **Page par citation adressée par l'intervention et le minutage**
  (`/interventions/<id>/citation/<secondes>`) plutôt que par un identifiant
  aléatoire : l'adresse survit à une régénération quand le minutage est le même, et
  sinon ouvre l'intervention au même moment.

## Alternatives écartées

- **Second appel dédié aux citations** : la vidéo serait lue deux fois, pour un coût
  doublé à terme.
- **Sous-titres YouTube** : leur téléchargement n'est permis que par l'API au
  propriétaire de la chaîne, et ils sont absents ou automatiques sur beaucoup de
  vidéos.
- **Moteur de recherche externe** (Meilisearch, Typesense) : un service de plus à
  déployer, pour quelques milliers de citations.
- **Identifiant aléatoire par citation** : il changerait à chaque régénération, et
  les liens partagés seraient cassés.

## Conséquences

- Les mots d'une citation peuvent différer légèrement de ce qui est dit. La mention
  et l'écoute du passage permettent de vérifier, et un échantillon est vérifié avant
  la mise en ligne.
- Changer la consigne des résumés régénère aussi les citations, et les adresses de
  citation dont le minutage change se replient sur l'intervention.
