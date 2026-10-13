import { describe, expect, test } from 'bun:test';
import { TRPCError } from '@trpc/server';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { z } from 'zod';

import { createContext } from './context';
import { appRouter, createCaller } from './root';
import { createCallerFactory, publicProcedure, router } from './trpc';

// Routeur de test : procédures internes qui exercent la validation et les erreurs.
const testRouter = router({
  echo: publicProcedure.input(z.object({ count: z.number().int() })).query(({ input }) => input),
  boom: publicProcedure.query(() => {
    throw new Error('détail interne à ne pas divulguer');
  }),
});

async function call(r: typeof testRouter | typeof appRouter, path: string, isDev: boolean) {
  const res = await fetchRequestHandler({
    endpoint: '/api/trpc',
    req: new Request(`http://localhost/api/trpc/${path}`),
    router: r,
    createContext: () => createContext({ version: '0.0.0-test', isDev }),
  });
  // biome-ignore lint/suspicious/noExplicitAny: réponse JSON tRPC inspectée librement dans les tests
  return { status: res.status, body: (await res.json()) as any };
}

describe('health', () => {
  test('renvoie ok, la version et un horodatage ISO 8601', async () => {
    const caller = createCaller(createContext({ version: '1.2.3', isDev: false }));
    const result = await caller.health();
    expect(result.status).toBe('ok');
    expect(result.version).toBe('1.2.3');
    expect(new Date(result.time).toISOString()).toBe(result.time);
  });

  test('est exposée en GET sur /api/trpc/health', async () => {
    const { status, body } = await call(appRouter, 'health', false);
    expect(status).toBe(200);
    expect(body.result.data.status).toBe('ok');
  });
});

describe('validation des entrées', () => {
  test('rejette une entrée invalide en indiquant le champ, sans exécuter la procédure', async () => {
    let executed = false;
    const guarded = router({
      echo: publicProcedure.input(z.object({ count: z.number() })).query(() => {
        executed = true;
        return null;
      }),
    });
    const caller = createCallerFactory(guarded)(createContext({ version: 't', isDev: false }));
    const error = await caller.echo({ count: 'trois' as never }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(TRPCError);
    expect((error as TRPCError).code).toBe('BAD_REQUEST');
    expect(executed).toBe(false);
  });

  test('renvoie les champs fautifs dans data.zodError via HTTP', async () => {
    const input = encodeURIComponent(JSON.stringify({ count: 'trois' }));
    const { status, body } = await call(testRouter, `echo?input=${input}`, false);
    expect(status).toBe(400);
    expect(body.error.data.code).toBe('BAD_REQUEST');
    expect(body.error.data.zodError.fieldErrors.count).toBeArray();
  });
});

describe('erreurs', () => {
  test('en production, aucune pile d’appels ni détail interne', async () => {
    const { status, body } = await call(testRouter, 'boom', false);
    expect(status).toBe(500);
    expect(body.error.data.code).toBe('INTERNAL_SERVER_ERROR');
    expect(body.error.data.stack).toBeUndefined();
    expect(body.error.message).toBe('Erreur interne');
    expect(JSON.stringify(body)).not.toContain('détail interne');
  });

  test('en développement, la pile d’appels est disponible', async () => {
    const { body } = await call(testRouter, 'boom', true);
    expect(body.error.data.stack).toBeString();
  });
});
