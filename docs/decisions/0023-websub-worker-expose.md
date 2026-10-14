---
id: "0023"
title: Détection des directs par WebSub, avec un point d'entrée public du worker
status: accepted
date: 2026-10-14
tags: [ingestion, architecture, securite, deploiement]
supersedes: null
superseded-by: null
related-specs: [intervention-collection, intervention-feed]
related-changes: [live-detection]
---

# 0023 — Détection des directs par WebSub, avec un point d'entrée public du worker

## Contexte

Un direct met 2 à 5 minutes à apparaître : collecte RSS toutes les 3 minutes,
flux en retard, puis cycles de classement et de rendu. Interroger l'API YouTube
plus souvent est exclu, car le quota est déjà consommé aux deux tiers (ADR
0017).

YouTube publie, pour chaque chaîne, des notifications push par le protocole
WebSub (hub `pubsubhubbub.appspot.com`) : un `POST` arrive en quelques secondes
à chaque création ou modification de vidéo. Le protocole exige une adresse de
rappel publique en HTTPS. Or le worker n'est pas exposé (ADR 0015), et seul le
worker écrit en base (ADR 0017).

## Décision

- **WebSub pour les chaînes YouTube suivies** :
  - le worker s'abonne au démarrage puis renouvelle chaque jour, avec un bail de
    5 jours ;
  - une notification déclenche `videos.list` pour la seule vidéo concernée (1
    unité), l'enregistrement, puis le classement et le rendu du lecteur
    immédiats ;
  - la collecte RSS reste le filet de sécurité.
- **Le worker expose un petit serveur HTTP**, sur un sous-domaine dédié, par
  exemple `hooks.lisnardplay.thimal.fr`. C'est une exception à l'ADR 0015. Le
  serveur :
  - n'accepte que `GET` (vérification du hub) et `POST` (notification) sur un
    seul chemin ;
  - refuse tout corps de plus de 64 Ko ;
  - vérifie la signature HMAC (`X-Hub-Signature`, secret partagé
    `WEBSUB_SECRET`) avant toute lecture ;
  - n'agit que pour les chaînes déclarées dans `sources.config.ts`, et ne lit
    aucune URL venue du corps de la notification : seule l'API YouTube est
    appelée, avec l'identifiant de la vidéo.
- **La frontière d'écriture est conservée** : le worker reçoit et écrit, l'app
  continue de seulement lire.
- **Surveillance rapprochée** des directs programmés : revérification toutes les
  30 secondes, de 15 minutes avant l'heure prévue jusqu'au démarrage.
- **Fonction désactivable** : sans `WEBSUB_CALLBACK_URL` ni `WEBSUB_SECRET`, le
  serveur ne démarre pas et rien ne change.

## Alternatives écartées

- **Réception par une API route de l'app**, qui déposerait l'événement dans une
  table lue par le worker : l'app écrirait en base, à l'encontre de l'ADR 0017,
  et le délai s'allongerait du cycle de lecture du worker.
- **Interroger la page `/live` des chaînes** (« scraping ») : fragile, contraire
  aux conditions de YouTube, et pas plus rapide sans multiplier les requêtes.
- **Raccourcir la cadence RSS et `videos.list`** : quota épuisé.

## Conséquences

- Le service `worker` reçoit un domaine dans Coolify et deux variables, et son
  port HTTP est routé par le proxy. Le réseau isolé du worker (voir
  `deploiement.md`) reste nécessaire.
- Une chaîne ajoutée à `sources.config.ts` est abonnée automatiquement au
  démarrage suivant.
- Les tests simulent le hub : vérification, notification signée, notification
  falsifiée.
