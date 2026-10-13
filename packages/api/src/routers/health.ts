import { publicProcedure } from '../trpc';

/** Santé de l'API : `GET /api/trpc/health`. */
export const health = publicProcedure.query(({ ctx }) => ({
  status: 'ok' as const,
  version: ctx.version,
  time: new Date().toISOString(),
}));
