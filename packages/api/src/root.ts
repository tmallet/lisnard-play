import { campaignRouter } from './routers/campaign';
import { health } from './routers/health';
import { interventionsRouter } from './routers/interventions';
import { membershipRouter } from './routers/membership';
import { notificationsRouter } from './routers/notifications';
import { quotesRouter, searchRouter } from './routers/quotes';
import { recapRouter } from './routers/recap';
import { createCallerFactory, router } from './trpc';

export const appRouter = router({
  health,
  interventions: interventionsRouter,
  notifications: notificationsRouter,
  membership: membershipRouter,
  campaign: campaignRouter,
  quotes: quotesRouter,
  search: searchRouter,
  recap: recapRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
