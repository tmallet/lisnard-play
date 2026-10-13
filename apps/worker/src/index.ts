/**
 * Démarrage du worker (ADR 0015) : migrations, sources, verrou de leader, puis boucle.
 */
import { createDb } from '@lisnard/db/client';
import { runMigrations } from '@lisnard/db/migrate';
import { upsertSources } from '@lisnard/db/write';

import { createSystemOneClassifier } from './classifier/systemone';
import { recheckLive, runCollection } from './collect';
import { CADENCE_MS, HEARTBEAT_FILE, LEADER_LOCK_KEY, requireEnv, TICK_MS } from './config';
import { log } from './log';
import { resolvePendingMedia } from './media/task';
import { classifyPending } from './publish';
import { Scheduler, type Task, tryAcquireLeaderLock } from './scheduler';
import type { SourceContext } from './sources/types';
import { SOURCES } from './sources.config';

const databaseUrl = requireEnv('DATABASE_URL');
const db = createDb(databaseUrl);

await runMigrations(db);
await upsertSources(
  db,
  SOURCES.map(({ id, kind, name, active }) => ({ id, kind, name, active })),
);

let lock = await tryAcquireLeaderLock(databaseUrl, LEADER_LOCK_KEY);
while (!lock.acquired) {
  log.info('autre instance active : attente du verrou');
  await Bun.sleep(TICK_MS);
  lock = await tryAcquireLeaderLock(databaseUrl, LEADER_LOCK_KEY);
}

const ctx: SourceContext = {
  fetch,
  youtubeApiKey: requireEnv('YOUTUBE_API_KEY'),
  quota: { youtubeUnits: 0 },
};

const classifier = createSystemOneClassifier({ apiKey: requireEnv('OPENROUTER_API_KEY') });

const tasks: Task[] = [
  {
    name: 'collect:youtube',
    everyMs: CADENCE_MS.youtube,
    run: async () => ({
      ...(await runCollection(
        db,
        SOURCES.filter((s) => s.kind === 'youtube'),
        ctx,
      )),
      recheckedLive: await recheckLive(db, ctx),
      youtubeUnits: ctx.quota.youtubeUnits,
    }),
  },
  {
    name: 'collect:rss',
    everyMs: CADENCE_MS.rss,
    run: () =>
      runCollection(
        db,
        SOURCES.filter((s) => s.kind === 'rss'),
        ctx,
      ),
  },
  {
    name: 'classify',
    everyMs: TICK_MS,
    run: () => classifyPending(db, classifier),
  },
  {
    name: 'media',
    everyMs: TICK_MS,
    run: () => resolvePendingMedia(db),
  },
];

const scheduler = new Scheduler(tasks, TICK_MS, HEARTBEAT_FILE);
log.info('worker démarré', { sources: SOURCES.filter((s) => s.active).length });
scheduler.start();

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, async () => {
    scheduler.stop();
    await lock.release();
    process.exit(0);
  });
}
