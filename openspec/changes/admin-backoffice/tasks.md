## 1. Données

- [x] 1.1 Colonnes `item.hidden_at`, `hidden_reason`, `summary_requested_at`, table `admin_action`, tables Better Auth (`auth_`) ; migration
- [x] 1.2 `visibleItem` et sélections du worker excluent les vidéos masquées ; tests (flux, recherche, citations, récap, plan du site, notifications)
- [x] 1.3 Point d'entrée `@lisnard/db/admin` : masquer, réafficher, demander un résumé, journal, liste filtrée ; tests
- [x] 1.4 Requête de création du rôle `lisnard_admin` (droits limités), dans le guide de déploiement

## 2. Worker

- [x] 2.1 Demandes de résumé prioritaires, marque levée à l'enregistrement ou à l'abandon ; tests

## 3. Service admin

- [x] 3.1 `apps/admin` : serveur Bun, Better Auth (mot de passe sans inscription, TOTP obligatoire, codes de secours, cookie restreint, limitation), commandes `create-account` et `reset-2fa` ; tests
- [x] 3.2 Routeur d'administration protégé (vidéos : liste, détail, masquer, réafficher, relancer ; historique) ; tests
- [x] 3.3 Interface Refine + shadcn/ui : connexion, association TOTP, vidéos, historique
- [x] 3.4 Image Docker et `noindex`

## 4. App

- [x] 4.1 `server.ts` relaie `/admin/*` vers le service admin ; `robots.txt` exclut `/admin` ; tests

## 5. Qualité

- [x] 5.1 Smoke : `/admin` exige la connexion ; inscription refusée ; vidéo masquée absente du flux et du plan du site
- [x] 5.2 Vérification de bout en bout (création du compte, TOTP, masquage, relance)
- [x] 5.3 `bun run check` et `bun run smoke:web` au vert

## 6. Documentation

- [x] 6.1 ADR 0032 et index ; `deploiement.md` (service admin, rôle Postgres, variables, création du compte), `docs/architecture/README.md`, AGENTS (nouveau `apps/admin/AGENTS.md`, db, worker, app), `commandes.md`
