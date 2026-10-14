/**
 * Démarrage du worker (ADR 0015) : migrations, sources, verrou de leader, puis boucle.
 */
import { writeFile } from 'node:fs/promises';

import { createDb } from '@lisnard/db/client';
import { runMigrations } from '@lisnard/db/migrate';
import { upsertSources } from '@lisnard/db/write';

import { createSystemOneClassifier } from './classifier/systemone';
import { recheckLive, runBackfill, runCollection } from './collect';
import {
  CADENCE_MS,
  HEARTBEAT_FILE,
  LEADER_LOCK_KEY,
  requireEnv,
  SUMMARY_DAILY_BUDGET_USD,
  TICK_MS,
} from './config';
import { log } from './log';
import { resolvePendingMedia } from './media/task';
import { classifyPending } from './publish';
import { Scheduler, type Task, tryAcquireLeaderLock } from './scheduler';
import type { SourceContext } from './sources/types';
import { SOURCES } from './sources.config';
import { createOpenRouterSummarizer } from './summaries/openrouter';
import { summarizePending } from './summaries/task';

const databaseUrl = requireEnv('DATABASE_URL');
const db = createDb(databaseUrl);

// Verrou d'abord : pendant un déploiement progressif, une seule instance migre. L'instance
// en attente bat quand même, pour ne pas être redémarrée par le healthcheck.
let lock = await tryAcquireLeaderLock(databaseUrl, LEADER_LOCK_KEY);
while (!lock.acquired) {
  log.info('autre instance active : attente du verrou');
  await writeFile(HEARTBEAT_FILE, new Date().toISOString());
  await Bun.sleep(TICK_MS);
  lock = await tryAcquireLeaderLock(databaseUrl, LEADER_LOCK_KEY);
}

await runMigrations(db);
await upsertSources(
  db,
  SOURCES.map(({ id, kind, name, active }) => ({ id, kind, name, active })),
);

const ctx: SourceContext = {
  fetch,
  youtubeApiKey: requireEnv('YOUTUBE_API_KEY'),
  quota: { youtubeUnits: 0 },
};

const classifier = createSystemOneClassifier({ apiKey: requireEnv('OPENROUTER_API_KEY') });
const summarizer = createOpenRouterSummarizer({ apiKey: requireEnv('OPENROUTER_API_KEY') });

const tasks: Task[] = [
  {
    // Premier cycle au démarrage, puis quotidien : toutes les vidéos des chaînes officielles.
    name: 'backfill:youtube',
    everyMs: CADENCE_MS.backfill,
    run: () => runBackfill(db, SOURCES, ctx),
  },
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
  {
    name: 'summarize',
    everyMs: CADENCE_MS.summarize,
    run: () => summarizePending(db, summarizer, { dailyBudget: SUMMARY_DAILY_BUDGET_USD }),
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
