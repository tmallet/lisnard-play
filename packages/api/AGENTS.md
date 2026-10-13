# packages/api — @lisnard/api

Routeur tRPC partagé, servi par `apps/app/src/app/api/trpc/[trpc]+api.ts`.
Le client n'importe que le **type** `AppRouter`.

## Structure

| Fichier | Rôle |
|---------|------|
| `src/trpc.ts` | `initTRPC` : `router`, `publicProcedure`, `createCallerFactory`, `errorFormatter` |
| `src/context.ts` | `createContext({ req?, version, isDev })` |
| `src/root.ts` | `appRouter` (assemblage des procédures), `AppRouter`, `createCaller` |
| `src/routers/*.ts` | Une procédure ou un sous-routeur par domaine |
| `src/index.ts` | API publique du package |

## Conventions

- Toute entrée est validée par zod (`.input(z.object(...))`). La validation
  précède l'exécution, et une erreur renvoie `BAD_REQUEST` avec `data.zodError`.
- Les erreurs volontaires passent par `TRPCError` avec un code explicite. Une
  erreur inattendue devient `INTERNAL_SERVER_ERROR`, avec un message masqué
  hors développement (spec `api-transport`).
- Sorties en JSON simple : dates en chaînes ISO 8601, pas de transformateur (ADR 0013).
- Pas de dépendance à Expo ni à React : le package doit rester exécutable par
  Bun seul (tests, futur worker).
- Pas de secret dans ce package tant qu'il est servi par l'app. Les secrets
  d'ingestion restent dans le worker (ADR 0011).

Pas à pas pour ajouter une procédure : skill `trpc-procedure`.

## Tests

`bun --filter @lisnard/api test` (`bun test`) :
- appel direct : `createCaller(createContext({ version, isDev }))` ;
- comportement HTTP (codes, format d'erreur) : `fetchRequestHandler` sur un
  `Request` construit à la main (voir `src/trpc.test.ts`).
