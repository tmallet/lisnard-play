## Context

Motivation : voir `proposal.md`. Décisions durables : ADR 0024, qui fait
exception à l'ADR 0017. Sur la détection des directs : ADR 0023.

État actuel :
- l'app web est pré-rendue (ADR 0011), servie par `server.ts`, qui sert aussi
  `dist/` et les fichiers de `public/` ;
- l'API ne fait que lire ;
- le worker connaît les passages en direct (WebSub, `recheck:soon`) et les
  publications (`classify`, `media`).

## Goals / Non-Goals

**Goals :**
- notifier un début de direct en moins de 30 s après sa détection ;
- un seul envoi par événement ;
- aucun compte ni service tiers sur le web.

**Non-Goals :** voir « Hors périmètre » dans la proposition.

## Decisions

### D1 — Données

```
push_subscription
  id uuid pk
  kind 'web' | 'expo'
  endpoint text unique     -- adresse Web Push, ou jeton ExponentPushToken[…]
  keys jsonb null          -- { p256dh, auth } pour le web
  live bool default true
  reminder bool default true
  new_item bool default false
  created_at, confirmed_at timestamptz   -- confirmed_at : dernier subscribe/update

notification_sent
  item_id uuid → item, kind 'live' | 'reminder' | 'new_item', sent_at
  pk (item_id, kind)
```

- `@lisnard/db/subscriptions` expose `saveSubscription` (upsert par `endpoint`),
  `updatePreferences` et `deleteSubscription`. C'est le seul module d'écriture
  importable par `packages/api` : `@lisnard/db/write` y reste interdit.
- Le worker lit les abonnements et écrit `notification_sent` par
  `@lisnard/db/write`.

### D2 — API

- `notifications.config` renvoie `{ vapidPublicKey | null }`, lu de l'environnement
  du serveur de l'app. `null` signifie que le web est désactivé.
- `notifications.subscribe({ kind, endpoint, keys?, preferences? })` enregistre
  l'abonnement et renvoie ses préférences.
- `notifications.update({ endpoint, preferences })` et
  `notifications.unsubscribe({ endpoint })` répondent `NOT_FOUND` pour une
  adresse inconnue.
- **Validation zod** :
  - Web : `https:`, hôte dans la liste blanche (`fcm.googleapis.com`,
    `updates.push.services.mozilla.com`, `web.push.apple.com`,
    `*.notify.windows.com`), clés en base64url de longueur attendue.
  - Expo : `^ExponentPushToken\[[A-Za-z0-9_-]{10,}\]$`.
- **Limite d'abus** : un abonnement connu est seulement confirmé (aucun comptage).
  Un nouvel abonnement est limité à 10 par adresse IP et par heure (en mémoire, un
  seul serveur d'app ; adresse = dernière entrée de `X-Forwarded-For`, ajoutée par le
  proxy), puis au plafond global de 50 000. Au-delà : `TOO_MANY_REQUESTS`.

### D3 — Web

- **Service worker** : `apps/app/public/sw.js`, servi à la racine pour couvrir
  toutes les pages.
  - `push` : affiche `{ title, body, url, tag }` avec l'icône de l'app ;
  - `notificationclick` : met au premier plan un onglet ouvert, ou en ouvre un
    sur `url`.
  - JavaScript statique, sans bundler.
- **Manifeste** : `public/manifest.webmanifest`, avec nom, couleurs de la charte,
  icônes et `display: standalone`, lié depuis `+html.tsx`. Il permet
  l'installation sur l'écran d'accueil, condition des notifications sur iPhone.
- **Client** : `src/lib/push.web.ts` enregistre le service worker, appelle
  `PushManager.subscribe({ userVisibleOnly, applicationServerKey })` puis
  `notifications.subscribe`. L'adresse d'abonnement reste dans le navigateur
  (`pushManager.getSubscription()`), sans stockage local supplémentaire.
- **Compatibilité** : `'PushManager' in window`. Sur iPhone,
  `navigator.standalone` permet d'afficher l'explication.

### D4 — Mobile

- **Dépendances** : `bunx expo install expo-notifications expo-device`, et le
  plugin `expo-notifications` (couleur de la charte).
- **Client** : `src/lib/push.native.ts`.
  - Créer un canal Android « Directs » avant la demande d'autorisation ;
  - obtenir le jeton avec `getExpoPushTokenAsync({ projectId })` ;
  - sans `projectId` ou sur simulateur, renvoyer `unsupported`.
- **Toucher une notification** : `useLastNotificationResponse` dans la racine
  ouvre `/interventions/<id>`.

### D5 — Détection et envoi (worker)

- **Tâche `notify`** : toutes les 30 s, et appelée en fin de voie rapide WebSub.
  Elle sélectionne les événements candidats sans entrée dans
  `notification_sent` :
  - `live` : `published`, rendu présent, `live_status = 'live'`, `starts_at`
    (ou à défaut `first_seen_at`) dans les 2 dernières heures ;
  - `reminder` : `published`, rendu présent (la notification ouvre la page de
    détail), `upcoming`, `starts_at` dans les 15 prochaines minutes ;
  - `new_item` : `published`, rendu présent, `live_status in ('none','ended')`,
    `first_seen_at` dans les 2 dernières heures.
- **Un seul envoi** : chaque événement est d'abord inséré dans
  `notification_sent` (`on conflict do nothing`), puis envoyé à tous les
  abonnements qui l'ont choisi. Une panne pendant l'envoi fait perdre la
  notification plutôt que la doubler.
- **Contenu** :
  - titre « En direct : <titre> », « Dans 15 min : <titre> » ou « Nouveau :
    <titre> » ;
  - corps = média (outlet) ;
  - `url` = `/interventions/<id>`, et `tag` = id de l'intervention pour remplacer
    une notification précédente.
- **Web** : bibliothèque `web-push`, `TTL` de 1 h pour un direct et 6 h pour le
  reste, urgence `high` pour un direct. Une réponse 404 ou 410 supprime
  l'abonnement.
- **Expo** : `POST https://exp.host/--/api/v2/push/send` par lots de 100. Un
  ticket `DeviceNotRegistered` supprime l'abonnement. Les reçus différés ne sont
  pas suivis pour l'instant.
- **Purge** : chaque jour, suppression des abonnements dont `confirmed_at`
  dépasse 13 mois. L'app rappelle `subscribe` à chaque ouverture de l'écran des
  notifications et au démarrage si elle est abonnée, ce qui rafraîchit
  `confirmed_at`.
- **Sans `VAPID_PRIVATE_KEY`** : avertissement au démarrage ; un événement attendu
  par des abonnés web n'est pas réservé (compté `deferred`) et part dès que les clés
  sont configurées, s'il reste dans la fenêtre de 2 h.

### D6 — Écran

Route `src/app/notifications.tsx`, accessible depuis « À propos » :
- un titre, une explication et un bouton « Activer les notifications » ;
- une fois abonné, trois interrupteurs (« Début d'un direct », « Rappel
  15 minutes avant », « Nouvelles interventions ») et « Désactiver ».

Charte : skill `charte-ui` (ADR 0001).

## Risks / Trade-offs

- **[Abus d'inscription]** : la liste blanche empêche de viser n'importe quelle
  adresse. Le plafond global limite le remplissage de la table.
- **[Volume « nouvelle intervention »]** : plusieurs envois par jour, mais
  l'option est désactivée par défaut.
- **[Perte plutôt que doublon]** : choix assumé (D5).
- **[Clés VAPID]** : à générer une fois et à sauvegarder. Si elles sont perdues,
  tous les appareils doivent se réabonner.

## Migration Plan

1. Merger : la migration 0007 s'applique au démarrage du worker.
2. Générer les clés avec `bunx web-push generate-vapid-keys`.
3. Dans Coolify :
   - worker : `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` et
     `VAPID_SUBJECT=mailto:lisnardplay@tmallet.fr` ;
   - app : `VAPID_PUBLIC_KEY`.
4. Redéployer les deux services, s'abonner depuis un navigateur, puis vérifier
   dans les logs `notify` au prochain événement.

**Retour arrière** : retirer `VAPID_PUBLIC_KEY` de l'app. L'écran indique alors
que les notifications sont indisponibles, et le worker n'envoie plus rien aux
abonnements web.
