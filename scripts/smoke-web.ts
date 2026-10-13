/**
 * Smoke test web (design D7, ADR 0009).
 * Exporte l'app en production, la sert localement, puis vérifie par HTTP, sans
 * exécuter de JavaScript, les exigences des specs app-shell et api-transport.
 *
 * Usage : bun run smoke:web   (SMOKE_PORT pour changer le port, SKIP_EXPORT=1 pour réutiliser dist/)
 */
import { resolve } from 'node:path';

const APP_DIR = resolve(import.meta.dir, '../apps/app');
// Binaire direct (pas bunx) : kill() doit atteindre le processus serveur lui-même.
const EXPO = resolve(import.meta.dir, '../node_modules/.bin/expo');
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
      await fetch(BASE);
      return;
    } catch {
      await Bun.sleep(300);
    }
  }
  throw new Error(`Le serveur ne répond pas sur ${BASE}`);
}

function checkPage(path: string, html: string, expectedTitle: string, notice: string) {
  check(`${path} : <html lang="fr">`, /<html[^>]*\blang="fr"/.test(html));
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

if (!process.env.SKIP_EXPORT) await run([EXPO, 'export', '--platform', 'web']);

const server = Bun.spawn([EXPO, 'serve', '--port', String(PORT)], {
  cwd: APP_DIR,
  stdout: 'ignore',
  stderr: 'inherit',
});

try {
  await waitForServer();
  const { INDEPENDENCE_NOTICE, pageTitle } = await import('../apps/app/src/config/app');

  const home = await (await fetch(`${BASE}/`)).text();
  checkPage('/', home, pageTitle(), INDEPENDENCE_NOTICE);

  const about = await (await fetch(`${BASE}/a-propos`)).text();
  checkPage('/a-propos', about, pageTitle('À propos'), INDEPENDENCE_NOTICE);

  const res = await fetch(`${BASE}/api/trpc/health`);
  const body = (await res.json()) as {
    result?: { data?: { status?: string; version?: string; time?: string } };
  };
  const data = body.result?.data;
  check('/api/trpc/health : HTTP 200', res.status === 200);
  check('/api/trpc/health : status "ok"', data?.status === 'ok');
  check('/api/trpc/health : version non vide', Boolean(data?.version));
  check(
    '/api/trpc/health : horodatage ISO 8601',
    !!data?.time && new Date(data.time).toISOString() === data.time,
  );
} finally {
  server.kill();
  await server.exited;
}

if (failures.length > 0) {
  console.error(`\n${failures.length} vérification(s) en échec.`);
  process.exit(1);
}
console.log('\nSmoke test web : OK');
process.exit(0);
