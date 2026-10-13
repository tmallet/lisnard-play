import { initTRPC } from '@trpc/server';
import { ZodError, z } from 'zod';

import type { Context } from './context';

const t = initTRPC.context<Context>().create({
  errorFormatter({ shape, error, ctx }) {
    // Hors développement, aucune pile d'appels ne sort de l'API (spec api-transport).
    // Sans contexte (échec de création), on applique la règle la plus stricte.
    const { stack: _stack, ...data } = shape.data;
    const hideInternals = !ctx?.isDev && error.code === 'INTERNAL_SERVER_ERROR';
    return {
      ...shape,
      message: hideInternals ? 'Erreur interne' : shape.message,
      data: {
        ...(ctx?.isDev ? shape.data : data),
        zodError: error.cause instanceof ZodError ? z.flattenError(error.cause) : null,
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const createCallerFactory = t.createCallerFactory;
