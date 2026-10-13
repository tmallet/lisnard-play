import { appRouter, createContext } from '@lisnard/api';
import { createDb, type Db } from '@lisnard/db/client';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';

import pkg from '../../../../package.json';

// Connexion créée à la première requête et réutilisée ; absente si DATABASE_URL n'est pas défini.
let db: Db | null | undefined;
function getDb(): Db | null {
  if (db === undefined) db = process.env.DATABASE_URL ? createDb(process.env.DATABASE_URL) : null;
  return db;
}

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
      }),
  });
}

export { handler as GET, handler as POST };
