# apps/admin — backoffice

Backoffice de l'exploitant (spec `admin-backoffice`, ADR 0032), servi sous `/admin` par
un service séparé que `apps/app/server.ts` relaie. Lire aussi le `AGENTS.md` racine.

| Emplacement | Rôle |
|-------------|------|
| `server.ts` | Serveur Bun (port 3001) : variables `ADMIN_DATABASE_URL`, `BETTER_AUTH_SECRET`, `SITE_URL` (`{pr}` remplacé par le numéro de PR en prévisualisation, `src/preview.ts`) |
| `cli.ts` | `create-account --email` (compte unique, mot de passe demandé au terminal), `reset-2fa` |
| `src/auth.ts` | Better Auth : mot de passe sans inscription, extension `twoFactor` (TOTP), cookie `Path=/admin` `HttpOnly` `SameSite=Strict`, limitation des tentatives |
| `src/router.ts` | API tRPC d'administration : toute procédure exige une session **dont le TOTP est activé** (`authed`) ; seule `me` répond sans |
| `src/handler.ts` | Aiguillage sous `/admin` (auth, API, interface), `X-Robots-Tag: noindex` partout |
| `src/admin.test.ts` | Parcours complet : inscription refusée, cookie, mot de passe seul refusé, association TOTP, connexion avec code |
| `ui/` | Interface Refine 5 : mise en page, vues et tableau de données de Refine UI (registre `ui.refine.dev`, composants shadcn/ui copiés dans `ui/src/components`), fournisseurs de données et d'authentification (`ui/src/lib/providers.ts`), libellés français (`ui/src/lib/i18n.ts`) |
| `vite.config.ts` | Build de `ui/` vers `dist/`, base `/admin/` ; `bunx vite` en développement (API proxifiée vers le port 3001) |

## Règles

- **Sécurité** : ne jamais exposer de procédure sans `authed` ; ne jamais réactiver
  l'inscription ; garder le TOTP obligatoire. Le service n'a pas de domaine public.
- **Base** : seulement `@lisnard/db/admin` (et la lecture des tables d'auth par Better
  Auth), avec le rôle `lisnard_admin`. Une nouvelle écriture impose d'étendre ses droits
  (requête dans `docs/architecture/deploiement.md`) et l'ADR 0032.
- **Composants** `ui/src/components/ui` et `ui/src/components/refine-ui` : copiés depuis
  shadcn/ui et Refine UI (`bunx shadcn add …`, puis vérifier les imports `@/lib/utils` et
  `@/components/refine-ui/…` : la CLI les a déjà mal réécrits). Exclus du lint, formatés.
- **Charte** : thème shadcn aux couleurs du site (palette, Montserrat servie depuis
  `@expo-google-fonts/montserrat`) dans `ui/src/index.css`, sombre par défaut ; mention
  d'indépendance sur les écrans de connexion (ADR 0001). Composer avec les composants
  shadcn (`Field`, `Empty`, `Spinner`, toasts `sonner`) plutôt qu'à la main. Code TOTP :
  champ texte standard (`one-time-code`), pas `InputOTP`, que Bitwarden ne remplit pas.
- **Versions** : épinglées, publiées depuis au moins deux semaines.
