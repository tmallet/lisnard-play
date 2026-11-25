/**
 * Simulateur de `/api/trpc` pour les tests d'îlots : `fetch` intercepté, réponses par
 * procédure (lots `httpBatchLink` compris). Chaque appel est journalisé dans `calls`.
 */
import { vi } from 'vitest';

import { resetApiClients } from '@/lib/trpc';

type Handler = (input: unknown) => unknown;

export interface FakeApi {
  calls: { procedure: string; input: unknown }[];
}

export function fakeApi(handlers: Record<string, Handler>): FakeApi {
  resetApiClients();
  const api: FakeApi = { calls: [] };
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input), 'http://localhost');
      const names = url.pathname.replace('/api/trpc/', '').split(',');
      const raw =
        init?.method === 'POST'
          ? JSON.parse(String(init.body ?? '{}'))
          : JSON.parse(url.searchParams.get('input') ?? '{}');
      const results = await Promise.all(
        names.map(async (procedure, i) => {
          const value = raw[String(i)];
          api.calls.push({ procedure, input: value });
          const handler = handlers[procedure];
          if (!handler)
            return {
              error: {
                message: `${procedure} absent`,
                code: -32004,
                data: { code: 'NOT_FOUND', httpStatus: 404 },
              },
            };
          try {
            return { result: { data: await handler(value) } };
          } catch (error) {
            return {
              error: {
                message: String(error),
                code: -32603,
                data: { code: 'INTERNAL_SERVER_ERROR', httpStatus: 500 },
              },
            };
          }
        }),
      );
      const failed = results.some((r) => 'error' in r);
      return new Response(JSON.stringify(results), {
        status: failed && results.length === 1 ? 500 : 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }),
  );
  return api;
}
