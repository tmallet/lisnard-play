import { appRouter, createContext } from '@lisnard/api';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';

import pkg from '../../../../package.json';

function handler(req: Request) {
  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: () =>
      createContext({ req, version: pkg.version, isDev: process.env.NODE_ENV !== 'production' }),
  });
}

export { handler as GET, handler as POST };
