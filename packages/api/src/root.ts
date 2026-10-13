import { health } from './routers/health';
import { interventionsRouter } from './routers/interventions';
import { createCallerFactory, router } from './trpc';

export const appRouter = router({
  health,
  interventions: interventionsRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
