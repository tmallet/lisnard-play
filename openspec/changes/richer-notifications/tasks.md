## 1. Données

- [ ] 1.1 `listNotificationEvents` : champs supplémentaires (D1), attente du résumé pour les vidéos (10 min au plus) ; tests

## 2. Worker

- [ ] 2.1 `src/notifications/message.ts` : titres par type, texte, image (D2) ; titres en majuscules (D3) ; tests
- [ ] 2.2 Envoi : `image` dans le Web Push, image dans le message Expo ; notification de test mise à jour

## 3. App

- [ ] 3.1 `public/sw.js` : image de la notification

## 4. Qualité et documentation

- [ ] 4.1 Vérification réelle : notification de test sur iPhone et sur ordinateur (captures)
- [ ] 4.2 `docs/architecture/README.md`, `apps/worker/AGENTS.md` ; `bun run check` et `bun run smoke:web` au vert
