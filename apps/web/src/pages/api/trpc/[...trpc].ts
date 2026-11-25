import { appRouter } from '@lisnard/api';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import type { APIRoute } from 'astro';

import { apiContext } from '@/server/api';

/** Point d'accès tRPC des îlots (spec api-transport) : même contexte que les pages. */
export const ALL: APIRoute = ({ request }) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req: request,
    router: appRouter,
    createContext: () => apiContext(request),
  });
