## Why

Un direct est désormais détecté en quelques secondes (ADR 0023), mais encore
faut-il que l'utilisateur ouvre l'application pour le voir. Des notifications
web et mobiles permettent de prévenir au moment où un direct commence, un peu
avant un direct programmé, et, pour ceux qui le souhaitent, à chaque nouvelle
intervention.

## What Changes

- **Abonnement** : depuis l'app, l'utilisateur active les notifications d'un
  appareil et choisit trois types : début d'un direct (activé par défaut),
  rappel 15 minutes avant un direct programmé (activé par défaut) et nouvelle
  intervention (désactivé par défaut). Il peut les modifier ou tout désactiver.
- **Web** : Web Push standard (clés VAPID, service worker), sans service tiers
  ni compte. Manifeste web pour permettre l'installation sur l'écran d'accueil,
  seule voie de notification sur iPhone.
- **Mobile** : `expo-notifications` et le service Expo Push. Le code est écrit et
  testé, mais l'option reste masquée tant que le projet n'a pas de projet EAS ni
  d'identifiants Apple et Android (hors périmètre, voir plus bas).
- **API** : procédures tRPC `notifications.config`, `subscribe`, `update` et
  `unsubscribe`. L'API écrit dans une seule table, `push_subscription` : c'est
  une exception à la frontière d'écriture (ADR 0017), consignée dans un nouvel
  ADR 0024.
- **Envoi par le worker** : tâche `notify` qui repère les événements (passage en
  direct, direct imminent, nouvelle publication), les envoie une seule fois
  chacun, et supprime les abonnements expirés. La voie rapide WebSub (ADR 0023)
  déclenche l'envoi sans attendre la boucle.
- **Confidentialité** : la page des mentions légales décrit les données
  d'abonnement, leur finalité et leur durée de conservation.

## Capabilities

### New Capabilities
- `push-notifications` : abonnement d'un appareil, préférences par type, envoi
  des événements, désabonnement et expiration.

### Modified Capabilities
- `app-shell` : la page « Mentions légales et confidentialité » décrit aussi les
  données d'abonnement aux notifications.

## Impact

- **Base** : tables `push_subscription` et `notification_sent`, migration 0007 ;
  point d'entrée `@lisnard/db/subscriptions`, seul module d'écriture autorisé
  dans `packages/api`.
- **API** (`packages/api`) : routeur `notifications`, validation stricte des
  adresses de service push (liste blanche).
- **Worker** : `src/notifications/` (détection, envoi Web Push et Expo Push),
  dépendance `web-push`, variables `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`,
  `VAPID_SUBJECT`, `EXPO_ACCESS_TOKEN` (facultative).
- **App** : écran `/notifications`, entrée dans « À propos », `public/sw.js`,
  manifeste web, `expo-notifications` et son plugin ; variable
  `VAPID_PUBLIC_KEY` côté serveur de l'app.
- **Docs** : ADR 0024, architecture, déploiement (clés VAPID), mentions légales.
- ADR concernés : 0001 (charte), 0007 (médias), 0011 (pré-rendu), 0015, 0017,
  0022 (confidentialité), 0023 (WebSub).

## Hors périmètre

- Builds EAS, compte Apple Developer, identifiants FCM et APNs : les
  notifications mobiles seront activées par un change ultérieur, sans
  modification du code d'envoi.
- Filtrage par thème des nouvelles interventions.
- Comptes utilisateurs et synchronisation des préférences entre appareils.
- Statistiques d'ouverture des notifications.
