import { appRouter, createContext } from '@lisnard/api';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';

import pkg from '../../../../package.json';
import { getDb } from '../../../server/db';

function handler(req: Request) {
  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: () =>
      createContext({
        req,
        version: pkg.version,
        isDev: process.env.NODE_ENV !== 'production',
        db: getDb(),
        vapidPublicKey: process.env.VAPID_PUBLIC_KEY || null,
      }),
  });
}

export { handler as GET, handler as POST };
