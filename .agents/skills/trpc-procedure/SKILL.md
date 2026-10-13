---
name: trpc-procedure
description: Ajouter ou modifier une procédure tRPC (query ou mutation) dans packages/api et l'utiliser depuis apps/app. À utiliser dès qu'une fonctionnalité a besoin d'un nouvel appel client → serveur ou modifie un contrat d'API existant.
---

# Ajouter une procédure tRPC

Le contrat est décrit par la spec `api-transport`, les conventions par
`packages/api/AGENTS.md`.

## 1. Déclarer la procédure

Fichier `packages/api/src/routers/<domaine>.ts` : un sous-routeur par domaine
dès qu'il y a plus d'une procédure.

```ts
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

import { publicProcedure, router } from '../trpc';

export const interventionsRouter = router({
  byId: publicProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ input, ctx }) => {
      const found = undefined; // accès aux données
      if (!found) throw new TRPCError({ code: 'NOT_FOUND', message: 'Intervention introuvable' });
      return found;
    }),
});
```

Règles :
- Toujours `.input(z…)` dès qu'il y a un paramètre : la validation précède
  l'exécution.
- `query` pour une lecture, `mutation` pour une écriture.
- Sortie en JSON simple : dates en `toISOString()`.
- Les erreurs passent par `TRPCError` avec un code (`NOT_FOUND`,
  `BAD_REQUEST`…), jamais par un `throw new Error` volontaire (il serait
  masqué en « Erreur interne »).
- Pour une procédure protégée (admin, par exemple), créer d'abord un
  middleware dans `src/trpc.ts` et l'exporter (`protectedProcedure`). La
  décision d'authentification relève d'un ADR.

## 2. L'enregistrer

`packages/api/src/root.ts` :

```ts
export const appRouter = router({
  health,
  interventions: interventionsRouter,
});
```

## 3. La tester

`packages/api/src/routers/<domaine>.test.ts` (`bun test`) :

```ts
import { expect, test } from 'bun:test';
import { createContext } from '../context';
import { createCaller } from '../root';

const caller = createCaller(createContext({ version: 'test', isDev: false }));

test('renvoie NOT_FOUND pour un id inconnu', async () => {
  await expect(caller.interventions.byId({ id: 'x' })).rejects.toMatchObject({ code: 'NOT_FOUND' });
});
```

Couvrir le cas nominal, une entrée invalide et chaque erreur métier.

## 4. L'utiliser côté client

```tsx
import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '@/lib/trpc';

const trpc = useTRPC();
const { data, error, isPending } = useQuery(trpc.interventions.byId.queryOptions({ id }));
```

Mutation : `useMutation(trpc.x.y.mutationOptions())`.

## 5. Vérifier

```bash
bun run check
```

Si la sortie change de forme, la vérification de types échoue partout où le
client l'utilise. C'est voulu : corriger les usages. Mettre à jour
`apps/app/src/lib/api-contract.typecheck.ts` si la procédure fait partie du
contrat surveillé.
