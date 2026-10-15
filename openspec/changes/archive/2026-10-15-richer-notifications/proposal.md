## Why

Sur iPhone, une notification n'affiche qu'un titre coupé vers 30 caractères et une
ligne de texte. Aujourd'hui, « Nouveau : » et un titre YouTube en majuscules
occupent tout le titre (« Nouveau : GARAGES À VÉLO OBLIG… »), et la ligne de texte
ne donne que le nom de la chaîne. On ne sait pas de quoi parle l'intervention.

## What Changes

- **Titre court et explicite**, avec un emoji par type d'événement, toujours lisible
  en entier :
  - début de direct : « 🔴 David Lisnard est en direct » ;
  - rappel : « ⏰ Dans 15 min : David Lisnard en direct » ;
  - nouvelle vidéo de sa chaîne : « 🎥 Nouvelle vidéo de David Lisnard » ;
  - autre média : « 📰 David Lisnard sur BFMTV » (« dans » pour la presse écrite).
- **Texte** : le titre de l'intervention, en casse normale (un titre entièrement en
  majuscules est réécrit), puis, selon le cas, le média, l'heure du direct, la durée
  de la vidéo et la première phrase du résumé.
- **Attente du résumé** : une nouvelle vidéo est notifiée dès que son résumé est prêt,
  au plus tard 10 minutes après sa découverte. Les directs et les rappels partent
  sans attendre.
- **Image** : miniature de l'intervention, affichée là où Web Push le permet (Android,
  Chrome et Edge sur ordinateur ; ignorée par iOS).

## Capabilities

### New Capabilities

### Modified Capabilities
- `push-notifications` : contenu des notifications (titre, texte, image) et délai
  d'attente du résumé pour les nouvelles interventions.

## Impact

- **Base** (`write.ts`) : `listNotificationEvents` renvoie ce qu'il faut pour le
  texte (type, source officielle, début, durée, miniature, première phrase du résumé)
  et retient les nouvelles vidéos jusqu'au résumé ou 10 minutes.
- **Worker** (`src/notifications/`) : construction des messages, réécriture des
  titres en majuscules, image dans les envois Web Push et Expo.
- **App** : `public/sw.js` affiche l'image.
- ADR concernés : 0021 (résumés), 0024 (notifications).

## Hors périmètre

- Actions dans la notification (boutons « Regarder », « Plus tard »).
- Regroupement de plusieurs notifications.
- Personnalisation du ton ou des emojis par l'utilisateur.
