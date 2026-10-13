/**
 * Commandes d'exploitation du worker (design D4, D5) :
 *   bun run cli recompute                        recalcule la publication avec les seuils actuels
 *   bun run cli reclassify [--model M] [--version N]  reclasse en rappelant le classifieur
 */
import { parseArgs } from 'node:util';

import { createDb } from '@lisnard/db/client';
import { runMigrations } from '@lisnard/db/migrate';

import { createSystemOneClassifier } from './classifier/systemone';
import { requireEnv } from './config';
import { reclassify, recompute } from './publish';

const { positionals, values } = parseArgs({
  args: Bun.argv.slice(2),
  allowPositionals: true,
  options: { model: { type: 'string' }, version: { type: 'string' } },
});

const db = createDb(requireEnv('DATABASE_URL'));
await runMigrations(db);

switch (positionals[0]) {
  case 'recompute':
    console.log(await recompute(db));
    break;
  case 'reclassify': {
    const classifier = createSystemOneClassifier({ apiKey: requireEnv('OPENROUTER_API_KEY') });
    const filter = {
      ...(values.model && { model: values.model }),
      ...(values.version && { questionsVersion: Number(values.version) }),
    };
    console.log(await reclassify(db, classifier, filter));
    break;
  }
  default:
    console.error('Usage : bun run cli <recompute | reclassify [--model M] [--version N]>');
    process.exit(1);
}
process.exit(0);
