# packages/api — @lisnard/api

Routeur tRPC partagé, servi par `apps/app/src/app/api/trpc/[trpc]+api.ts`.
Le client n'importe que le **type** `AppRouter`.

## Structure

| Fichier | Rôle |
|---------|------|
| `src/trpc.ts` | `initTRPC` : `router`, `publicProcedure`, `createCallerFactory`, `errorFormatter` |
| `src/context.ts` | `createContext({ req?, version, isDev, db? })` : `db` est la connexion en lecture (absente si `DATABASE_URL` n'est pas défini) |
| `src/root.ts` | `appRouter` (assemblage des procédures), `AppRouter`, `createCaller` |
| `src/routers/*.ts` | Une procédure ou un sous-routeur par domaine : `health`, `interventions` (`list`, `byId`), `notifications` (`config`, `subscribe`, `update`, `unsubscribe`), `membership` (`timeline`), `campaign` (`places`) |
| `src/index.ts` | API publique du package |

## Conventions

- Toute entrée est validée par zod (`.input(z.object(...))`). La validation
  précède l'exécution, et une erreur renvoie `BAD_REQUEST` avec `data.zodError`.
- Les erreurs volontaires passent par `TRPCError` avec un code explicite. Une
  erreur inattendue devient `INTERNAL_SERVER_ERROR`, avec un message masqué
  hors développement (spec `api-transport`).
- Sorties en JSON simple : dates en chaînes ISO 8601, pas de transformateur (ADR 0013).
- Pas de dépendance à Expo ni à React : le package doit rester exécutable par
  Bun seul.
- **Base de données en lecture seule** : n'importer que `@lisnard/db/read`
  (ADR 0017), et `@lisnard/db/subscriptions` pour les seuls abonnements aux
  notifications (ADR 0024). Seuls les tests importent `@lisnard/db/write`, pour
  préparer leurs données ; un test l'impose (`notifications.test.ts`). Ne jamais
  renvoyer de donnée interne (probabilités, seuils, journal).
- **Abonnements** : l'appareil prouve qu'il détient l'abonnement en fournissant
  son `endpoint`. Une adresse Web Push hors de la liste blanche
  (`isPushServiceUrl`) est refusée : le worker ne doit jamais appeler d'autre hôte.
  Un nouvel abonnement est limité par adresse IP (`allowNewSubscription`, adresse lue
  par `clientIp` dans `X-Forwarded-For`) ; une confirmation ne l'est jamais.
- **Données d'adhésion** (`src/membership/source.ts`, ADR 0026) : seule lecture HTTP
  sortante de l'API, vers une adresse fixe, validée par zod, avec un cache de 90 s
  et un repli sur la dernière valeur valide. Les tests injectent une source factice
  (`ctx.membership`).
- Pas de secret dans ce package tant qu'il est servi par l'app. Les secrets
  d'ingestion restent dans le worker (ADR 0011).

Pas à pas pour ajouter une procédure : skill `trpc-procedure`.

## Tests

`bun --filter @lisnard/api test` (`bun test`, Postgres requis) :
- appel direct : `createCaller(createContext({ version, isDev }))` ;
- comportement HTTP (codes, format d'erreur) : `fetchRequestHandler` sur un
  `Request` construit à la main (voir `src/trpc.test.ts`) ;
- avec la base : `createTestDb()` de `@lisnard/db/testing`, puis données
  préparées via `write` (voir `src/interventions.test.ts`).
