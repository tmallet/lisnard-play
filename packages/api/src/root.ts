import { health } from './routers/health';
import { interventionsRouter } from './routers/interventions';
import { membershipRouter } from './routers/membership';
import { notificationsRouter } from './routers/notifications';
import { createCallerFactory, router } from './trpc';

export const appRouter = router({
  health,
  interventions: interventionsRouter,
  notifications: notificationsRouter,
  membership: membershipRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
