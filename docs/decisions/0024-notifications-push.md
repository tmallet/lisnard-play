---
id: "0024"
title: Notifications par Web Push et Expo Push, abonnements écrits par l'API
status: accepted
date: 2026-10-14
tags: [notifications, architecture, securite, confidentialite]
supersedes: null
superseded-by: null
related-specs: [push-notifications, app-shell]
related-changes: [push-notifications]
---

# 0024 — Notifications par Web Push et Expo Push, abonnements écrits par l'API

## Contexte

Les utilisateurs veulent être prévenus d'un direct sans ouvrir l'application. Il
faut pour cela :
- conserver, pour chaque appareil, une adresse d'envoi et des préférences ;
- envoyer depuis un serveur qui détient les clés.

Or seul le worker écrit en base (ADR 0017), et l'app n'a pas encore de builds
mobiles ni d'identifiants Apple ou Android.

## Décision

- **Web** : Web Push standard (RFC 8030, 8291, 8292).
  - Le navigateur fournit l'abonnement par `PushManager`, et un service worker
    statique (`public/sw.js`) affiche les notifications.
  - Clés VAPID propres au projet : la clé publique est servie par l'API, la clé
    privée ne réside que dans le worker.
  - Aucun service tiers ni compte.
- **Mobile** : `expo-notifications` et le service Expo Push, qui relaie vers APNs
  et FCM.
  - L'option reste masquée tant que l'app n'a pas de projet EAS
    (`extra.eas.projectId`).
  - `EXPO_ACCESS_TOKEN`, facultatif, ne réside que dans le worker.
- **Exception limitée à l'ADR 0017** :
  - l'API écrit dans la seule table `push_subscription`, par un point d'entrée
    dédié `@lisnard/db/subscriptions` ;
  - `packages/api` continue de n'importer ni `@lisnard/db/write`, ni aucune autre
    table en écriture ;
  - le worker lit ces abonnements, les supprime quand ils expirent, et écrit le
    journal des envois (`notification_sent`).
- **Possession comme preuve** : sans compte, l'appareil qui détient l'adresse
  d'abonnement (Web Push) ou le jeton (Expo) est seul à pouvoir modifier ou
  supprimer l'abonnement. Ces valeurs, longues et non devinables, servent de clé.
- **Liste blanche des adresses** : un abonnement Web Push n'est accepté que si
  son adresse est en HTTPS chez un service push connu. Sinon, le worker pourrait
  être poussé à envoyer des requêtes vers n'importe quelle adresse (SSRF, ADR
  0017).
- **Envoi par le worker** : il détecte les événements en base et les envoie une
  seule fois chacun (clé : intervention et type). Ce choix garde un seul
  détenteur des clés et un seul lieu de décision.

## Alternatives écartées

- **Abonnements reçus par le serveur WebSub du worker** : la frontière
  d'écriture resterait intacte, mais les clients appelleraient directement le
  worker, et sa surface exposée (ADR 0023) passerait d'un chemin signé à une API
  publique.
- **Service tiers (OneSignal, Firebase Cloud Messaging pour le web)** : compte et
  SDK supplémentaires, traceurs possibles, et données d'abonnement chez un tiers,
  à l'encontre de l'ADR 0022.
- **Expo Push pour le web** : non pris en charge par `expo-notifications` sur le
  web.

## Conséquences

- Les tests de `packages/api` vérifient qu'aucune autre table n'est écrite.
- Une nouvelle donnée personnelle (adresse d'abonnement) est conservée : elle
  est décrite dans les mentions légales et purgée après 13 mois sans
  confirmation.
- Les clés VAPID ne doivent jamais changer en production : sinon, tous les
  abonnements web deviennent invalides et chaque appareil doit se réabonner.
- Activer le mobile demandera des builds EAS et des identifiants Apple et FCM,
  sans modification du code d'envoi.
