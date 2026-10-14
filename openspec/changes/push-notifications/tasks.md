## 1. Données

- [x] 1.1 Schéma `push_subscription` et `notification_sent`, migration 0007
- [x] 1.2 `@lisnard/db/subscriptions` (enregistrer, mettre à jour, supprimer) ; export dans `package.json` ; tests
- [x] 1.3 Requêtes du worker dans `write.ts` : événements candidats, réservation d'un envoi, abonnements par préférence, suppression, purge à 13 mois ; tests

## 2. API

- [x] 2.1 Routeur `notifications` (`config`, `subscribe`, `update`, `unsubscribe`), validation (liste blanche, jeton Expo), plafond global ; tests
- [x] 2.2 Garde-fou : `packages/api` n'importe pas `@lisnard/db/write` (test ou contrôle existant étendu)

## 3. Worker

- [x] 3.1 Configuration VAPID et Expo (`config.ts`), dépendance `web-push`
- [x] 3.2 `src/notifications/` : contenu des messages, envoi Web Push et Expo, suppression des abonnements expirés ; tests avec un service push simulé
- [x] 3.3 Tâche `notify` (30 s, silencieuse sans envoi), appel en fin de voie rapide WebSub, purge quotidienne ; tests (direct, rappel, nouvelle intervention, pas de doublon, rattrapage ignoré)

## 4. App

- [x] 4.1 `public/sw.js` et `public/manifest.webmanifest`, liens dans `+html.tsx`, en-têtes servis correctement par `server.ts`
- [x] 4.2 `src/lib/push.web.ts` et `src/lib/push.native.ts` (`expo-notifications`, `expo-device`, plugin), API commune ; tests
- [x] 4.3 Écran `/notifications` et lien depuis « À propos » ; tests (activation, refus, iPhone, préférences, désactivation)
- [x] 4.3b Entrées : cloche dans l'en-tête web, lien sur l'accueil mobile (si compatible), invitation sur l'accueil sans direct ; tests
- [x] 4.4 Ouverture de l'intervention au toucher d'une notification (mobile)
- [x] 4.5 Mentions légales : section notifications ; `LEGAL.updatedAt`

## 5. Qualité et documentation

- [x] 5.1 Smoke web : `/sw.js`, `/manifest.webmanifest`, `/notifications`, `notifications.config`, abonnement refusé pour une adresse hors liste blanche
- [x] 5.2 Pare-feu du devcontainer : `exp.host` et services Web Push pour les tests manuels
- [x] 5.3 `docs/architecture/README.md`, `deploiement.md` (clés VAPID, variables), `commandes.md`, `.env.example`, `packages/api/AGENTS.md`, `packages/db/AGENTS.md`, `apps/worker/AGENTS.md`, `apps/app/AGENTS.md`
- [x] 5.4 `bun run check` et `bun run smoke:web` au vert
