import { health } from './routers/health';
import { interventionsRouter } from './routers/interventions';
import { notificationsRouter } from './routers/notifications';
import { createCallerFactory, router } from './trpc';

export const appRouter = router({
  health,
  interventions: interventionsRouter,
  notifications: notificationsRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
