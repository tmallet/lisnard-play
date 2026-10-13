import { health } from './routers/health';
import { createCallerFactory, router } from './trpc';

export const appRouter = router({
  health,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
