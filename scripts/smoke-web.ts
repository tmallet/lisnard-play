/**
 * Smoke test web (design D7, ADR 0009) : export de production servi par le serveur Bun
 * (apps/app/server.ts, comme sur Coolify) face à une base jetable contenant une
 * intervention publiée. Vérifie par HTTP, sans exécuter de JavaScript, les specs
 * app-shell, api-transport et intervention-feed.
 *
 * Usage : bun run smoke:web   (SMOKE_PORT pour changer le port, SKIP_EXPORT=1 pour réutiliser dist/)
 * Requiert un Postgres joignable via DATABASE_URL (local : docker compose up -d).
 */
import { resolve } from 'node:path';

import { createTestDb } from '../packages/db/src/testing';
import {
  recordClassification,
  recordSummary,
  setMedia,
  upsertItem,
  upsertSources,
} from '../packages/db/src/write';

const APP_DIR = resolve(import.meta.dir, '../apps/app');
const PORT = Number(process.env.SMOKE_PORT ?? 8091);
const BASE = `http://localhost:${PORT}`;

const failures: string[] = [];
function check(label: string, ok: boolean) {
  console.log(`${ok ? '✓' : '✗'} ${label}`);
  if (!ok) failures.push(label);
}

async function run(cmd: string[]) {
  const proc = Bun.spawn(cmd, { cwd: APP_DIR, stdout: 'inherit', stderr: 'inherit' });
  if ((await proc.exited) !== 0) throw new Error(`Échec : ${cmd.join(' ')}`);
}

async function waitForServer(timeoutMs = 30_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      await fetch(`${BASE}/api/trpc/health`);
      return;
    } catch {
      await Bun.sleep(300);
    }
  }
  throw new Error(`Le serveur ne répond pas sur ${BASE}`);
}

function checkPage(path: string, html: string, expectedTitle: string | null, notice: string) {
  check(`${path} : <html lang="fr">`, /<html[^>]*\blang="fr"/.test(html));
  if (expectedTitle)
    check(
      `${path} : <title> « ${expectedTitle} »`,
      new RegExp(`<title[^>]*>${expectedTitle}</title>`).test(html),
    );
  check(
    `${path} : meta description`,
    /<meta[^>]*name="description"[^>]*content="[^"]+"/.test(html),
  );
  for (const prop of ['og:title', 'og:description', 'og:type']) {
    check(
      `${path} : meta ${prop}`,
      new RegExp(`<meta[^>]*property="${prop}"[^>]*content="[^"]+"`).test(html),
    );
  }
  check(`${path} : mention d'indépendance`, html.includes(notice));
}

const trpcUrl = (procedure: string, input: unknown) =>
  `${BASE}/api/trpc/${procedure}?input=${encodeURIComponent(JSON.stringify(input))}`;

// Export sous Node quand il est installé : sous Bun, Metro (SDK 57) échoue sur Linux quand Node est
// aussi présent (« Cannot find module './Worker.js' »). L'export n'exécute pas les API routes.
if (!process.env.SKIP_EXPORT) await run(['bunx', 'expo', 'export', '--platform', 'web']);

// Base jetable avec une intervention publiée (rendu média compris).
const { db, url, drop } = await createTestDb();
await upsertSources(db, [
  { id: 'yt:smoke', kind: 'youtube', name: 'Chaîne de test', active: true },
]);
const { id } = await upsertItem(db, {
  sourceId: 'yt:smoke',
  platformId: 'yt:smoke-1',
  url: 'https://www.youtube.com/watch?v=smoke-1',
  title: 'Intervention de test',
  description: 'Contenu du smoke test',
  publishedAt: new Date('2026-06-01T08:00:00Z'),
});
await recordClassification(db, {
  itemId: id,
  model: 'smoke',
  questionsVersion: 0,
  inputHash: 'smoke',
  answers: {
    intervient: 1,
    role: { choice: 'national', confidence: 1, probabilities: {} },
    kind: { choice: 'tv', confidence: 1, probabilities: {} },
    themes: { economie: 0.9 },
  },
  thresholds: { intervient: 0.75, role: 0.6, theme: 0.5 },
  outcome: 'published',
  role: 'national',
  kind: 'tv',
  themes: ['economie'],
});
await setMedia(db, id, {
  kind: 'embed',
  provider: 'youtube',
  embedUrl: 'https://www.youtube.com/embed/smoke-1',
});
await recordSummary(db, id, {
  kind: 'ok',
  text: 'Résumé de test.',
  points: ['point de test'],
  model: 'smoke',
  promptVersion: 0,
  generatedAt: new Date().toISOString(),
  cost: 0,
});

const server = Bun.spawn(['bun', 'server.ts'], {
  cwd: APP_DIR,
  env: { ...process.env, PORT: String(PORT), DATABASE_URL: url, NODE_ENV: 'production' },
  stdout: 'ignore',
  stderr: 'inherit',
});

try {
  await waitForServer();
  const { INDEPENDENCE_NOTICE, pageTitle } = await import('../apps/app/src/config/app');

  checkPage('/', await (await fetch(`${BASE}/`)).text(), pageTitle(), INDEPENDENCE_NOTICE);
  checkPage(
    '/a-propos',
    await (await fetch(`${BASE}/a-propos`)).text(),
    pageTitle('À propos'),
    INDEPENDENCE_NOTICE,
  );

  const detail = await fetch(`${BASE}/interventions/${id}`);
  check('/interventions/<id> : HTTP 200 (URL partageable)', detail.status === 200);
  checkPage('/interventions/<id>', await detail.text(), null, INDEPENDENCE_NOTICE);

  const health = await fetch(`${BASE}/api/trpc/health`);
  const h = (
    (await health.json()) as {
      result?: { data?: { status?: string; version?: string; time?: string } };
    }
  ).result?.data;
  check('/api/trpc/health : HTTP 200, status "ok"', health.status === 200 && h?.status === 'ok');
  check(
    '/api/trpc/health : version et horodatage ISO 8601',
    !!h?.version && !!h.time && new Date(h.time).toISOString() === h.time,
  );

  const list = (await (await fetch(trpcUrl('interventions.list', { status: 'past' }))).json()) as {
    result?: { data?: { items?: { id: string }[] } };
  };
  check(
    'interventions.list : renvoie l’intervention publiée',
    list.result?.data?.items?.[0]?.id === id,
  );

  const byTheme = async (theme: string) =>
    (
      (await (await fetch(trpcUrl('interventions.list', { status: 'past', theme }))).json()) as {
        result?: { data?: { items?: { id: string; themes: string[] }[] } };
      }
    ).result?.data?.items ?? [];
  const economie = await byTheme('economie');
  check(
    'interventions.list filtré par thème : renvoie l’intervention et ses thèmes',
    economie[0]?.id === id && economie[0]?.themes.join() === 'economie',
  );
  check(
    'interventions.list filtré par un autre thème : vide',
    (await byTheme('securite')).length === 0,
  );

  const byId = (await (await fetch(trpcUrl('interventions.byId', { id }))).json()) as {
    result?: { data?: { media?: { kind?: string }; summary?: { text?: string } | null } };
  };
  check('interventions.byId : rendu média intégré', byId.result?.data?.media?.kind === 'embed');
  check(
    'interventions.byId : résumé exposé, sans donnée interne',
    byId.result?.data?.summary?.text === 'Résumé de test.' &&
      !JSON.stringify(byId.result?.data?.summary).includes('smoke'),
  );

  const malformed = await fetch(`${BASE}/%E0%A4%A`);
  check('URL mal encodée : pas d’erreur serveur', malformed.status < 500);

  const missing = await fetch(
    trpcUrl('interventions.byId', { id: '00000000-0000-0000-0000-000000000000' }),
  );
  check('interventions.byId inconnu : HTTP 404', missing.status === 404);
} finally {
  server.kill();
  await server.exited;
  await drop();
}

if (failures.length > 0) {
  console.error(`\n${failures.length} vérification(s) en échec.`);
  process.exit(1);
}
console.log('\nSmoke test web : OK');
process.exit(0);
