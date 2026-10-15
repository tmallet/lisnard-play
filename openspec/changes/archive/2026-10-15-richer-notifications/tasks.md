## 1. Données

- [x] 1.1 `listNotificationEvents` : champs supplémentaires (D1), attente du résumé pour les vidéos (10 min au plus) ; tests

## 2. Worker

- [x] 2.1 `src/notifications/message.ts` : titres par type, texte, image (D2) ; titres en majuscules (D3) ; tests
- [x] 2.2 Envoi : `image` dans le Web Push, image dans le message Expo ; notification de test mise à jour

## 3. App

- [x] 3.1 `public/sw.js` : image de la notification

## 4. Qualité et documentation

- [ ] 4.1 Vérification réelle : notification de test sur iPhone et sur ordinateur (captures)

  Fait en local : aperçu des messages sur des interventions réelles (vidéo officielle avec résumé, article de presse, direct). Reste à faire sur appareil après déploiement : `bun cli.js notify --test` envoie la dernière intervention publiée au format réel.
- [x] 4.2 `docs/architecture/README.md`, `apps/worker/AGENTS.md` ; `bun run check` et `bun run smoke:web` au vert
