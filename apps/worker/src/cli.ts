/**
 * Commandes d'exploitation du worker (design D4, D5) :
 *   bun run cli recompute                        recalcule la publication avec les seuils actuels
 *   bun run cli reclassify [--model M] [--version N]  reclasse en rappelant le classifieur
 *   bun run cli calibrate [--validated] [--model M]  mesure les seuils sur eval/reference.jsonl
 *   bun run cli backfill                         rattrape toutes les vidéos des chaînes officielles
 *   bun run cli summarize [--budget N] [--retry]  résume les vidéos jusqu'au plafond du jour (N $)
 *   bun run cli media --refresh [--source ID]    recalcule le rendu des contenus publiés
 */
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';

import { createDb } from '@lisnard/db/client';
import { runMigrations } from '@lisnard/db/migrate';
import { resetFailedSummaries } from '@lisnard/db/write';
import {
  collectAnswers,
  evaluate,
  labelAccuracy,
  loadReference,
  proposeThresholds,
  themeScores,
} from './calibrate';
import { createSystemOneClassifier } from './classifier/systemone';
import { thresholdsFor } from './classifier/thresholds';
import { runBackfill } from './collect';
import { requireEnv, SUMMARY_DAILY_BUDGET_USD } from './config';
import { refreshMedia } from './media/task';
import { reclassify, recompute } from './publish';
import { SOURCES } from './sources.config';
import { createOpenRouterSummarizer } from './summaries/openrouter';
import { summarizePending } from './summaries/task';

const { positionals, values } = parseArgs({
  args: Bun.argv.slice(2),
  allowPositionals: true,
  options: {
    model: { type: 'string' },
    version: { type: 'string' },
    validated: { type: 'boolean' },
    budget: { type: 'string' },
    retry: { type: 'boolean' },
    refresh: { type: 'boolean' },
    source: { type: 'string' },
  },
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
  case 'summarize': {
    if (values.retry) console.log({ relancés: await resetFailedSummaries(db) });
    const summarizer = createOpenRouterSummarizer({ apiKey: requireEnv('OPENROUTER_API_KEY') });
    const dailyBudget = values.budget ? Number(values.budget) : SUMMARY_DAILY_BUDGET_USD;
    // Cycles successifs jusqu'à épuisement des vidéos à résumer ou du budget du jour.
    for (;;) {
      const stats = await summarizePending(db, summarizer, { dailyBudget });
      console.log(stats);
      const done = stats.summarized + stats.notSpeaking + stats.skipped + stats.failed;
      if (stats.budgetReached || stats.unavailable || done === 0) break;
    }
    break;
  }
  case 'media': {
    if (!values.refresh) throw new Error('Usage : media --refresh [--source ID]');
    console.log(await refreshMedia(db, {}, values.source));
    break;
  }
  case 'backfill': {
    const ctx = { fetch, youtubeApiKey: requireEnv('YOUTUBE_API_KEY'), quota: { youtubeUnits: 0 } };
    console.log({ ...(await runBackfill(db, SOURCES, ctx)), youtubeUnits: ctx.quota.youtubeUnits });
    break;
  }
  case 'calibrate': {
    const classifier = createSystemOneClassifier({
      apiKey: requireEnv('OPENROUTER_API_KEY'),
      ...(values.model && { model: values.model }),
    });
    const all = await loadReference(resolve(import.meta.dir, '../eval/reference.jsonl'));
    const cases = values.validated ? all.filter((c) => c.validated) : all;
    const answers = await collectAnswers(db, classifier, cases);
    const current = thresholdsFor(classifier.model);
    const pct = (n: number) => `${(n * 100).toFixed(1)} %`;
    console.log(
      `Jeu de référence : ${cases.length} cas (${answers.size} avec réponse) — modèle ${classifier.model}`,
    );
    const acc = labelAccuracy(cases, answers);
    console.log(
      `Exactitude sur ${acc.cases} interventions : rôle ${pct(acc.role)}, type ${pct(acc.kind)}`,
    );
    if (current) {
      const ev = evaluate(cases, answers, current);
      console.log(
        `Seuils actuels ${JSON.stringify(current)} : précision ${pct(ev.precision)}, rappel ${pct(ev.recall)} (VP ${ev.tp}, FP ${ev.fp}, FN ${ev.fn}, VN ${ev.tn})`,
      );
      for (const e of ev.errors)
        console.log(
          `  ${e.kind.padEnd(12)} p=${e.intervient.toFixed(2)} ${e.role}(${e.confidence.toFixed(2)})  ${e.title.slice(0, 90)}${e.note ? `  [${e.note}]` : ''}`,
        );
    }
    const themes = themeScores(cases, answers, current?.theme ?? 0.5);
    if (themes.cases > 0) {
      console.log(`Thèmes (${themes.cases} cas étiquetés, seuil ${current?.theme ?? 0.5}) :`);
      for (const t of themes.scores)
        console.log(
          `  ${t.theme.padEnd(14)} précision ${pct(t.precision)}, rappel ${pct(t.recall)} (VP ${t.tp}, FP ${t.fp}, FN ${t.fn})`,
        );
    }
    const best = proposeThresholds(cases, answers);
    console.log(
      best
        ? `Proposition (précision max, rappel ≥ 80 %) : ${JSON.stringify(best.thresholds)} → précision ${pct(best.precision)}, rappel ${pct(best.recall)}`
        : 'Aucun couple de seuils n’atteint un rappel de 80 %.',
    );
    break;
  }
  default:
    console.error(
      'Usage : bun run cli <recompute | reclassify [--model M] [--version N] | calibrate [--validated] [--model M] | backfill | summarize [--budget N] [--retry] | media --refresh [--source ID]>',
    );
    process.exit(1);
}
process.exit(0);
