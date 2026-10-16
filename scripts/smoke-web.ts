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
  recordPlace,
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

async function waitForServer(base = BASE, timeoutMs = 30_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      await fetch(`${base}/api/trpc/health`);
      return;
    } catch {
      await Bun.sleep(300);
    }
  }
  throw new Error(`Le serveur ne répond pas sur ${base}`);
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
    themes: { economy: 0.9 },
  },
  thresholds: { intervient: 0.75, role: 0.6, theme: 0.5 },
  outcome: 'published',
  role: 'national',
  kind: 'tv',
  themes: ['economy'],
});
await setMedia(db, id, {
  kind: 'embed',
  provider: 'youtube',
  embedUrl: 'https://www.youtube.com/embed/smoke-1',
});
await recordSummary(
  db,
  id,
  {
    kind: 'ok',
    text: 'Résumé de test.',
    points: ['point de test'],
    model: 'smoke',
    promptVersion: 0,
    generatedAt: new Date().toISOString(),
    cost: 0,
  },
  [
    { text: 'Il faut réformer l’école dès le primaire.', startS: 125, theme: 'education' },
    // Guillemets droits et esperluette : l'en-tête réécrit doit rester du HTML valide.
    { text: 'Il a dit "non" & c’est tout.', startS: 300, theme: null },
  ],
);

// Source des adhésions factice (ADR 0026) : le smoke test n'appelle jamais le site du parti.
const membershipFixture = Bun.serve({
  port: PORT + 2,
  fetch: (req) =>
    new URL(req.url).pathname.endsWith('/historique.json')
      ? Response.json({ jours: [{ jour: '2026-06-01', adherents: 20000 }] })
      : Response.json({ adherents: 20500, mis_a_jour: '2026-06-02T08:00:00.000Z' }),
});

await recordPlace(db, id, {
  onSite: true,
  label: 'Saint-Raphaël, Var',
  city: 'Saint-Raphaël',
  lat: 43.4427,
  lon: 6.7685,
  approximate: false,
  model: 'smoke',
  promptVersion: 0,
  generatedAt: new Date().toISOString(),
  cost: 0,
});

const server = Bun.spawn(['bun', 'server.ts'], {
  cwd: APP_DIR,
  env: {
    ...process.env,
    PORT: String(PORT),
    DATABASE_URL: url,
    NODE_ENV: 'production',
    ALLOW_INDEXING: '',
    VAPID_PUBLIC_KEY: 'BSmokeVapidKey',
    MEMBERSHIP_SOURCE_URL: `http://localhost:${PORT + 2}`,
  },
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

  // Mentions légales (spec app-shell, ADR 0022) : page pré-rendue, liée depuis le pied de page.
  const { LEGAL } = await import('../apps/app/src/config/legal');
  const legal = await (await fetch(`${BASE}/mentions-legales`)).text();
  checkPage(
    '/mentions-legales',
    legal,
    pageTitle('Mentions légales et confidentialité'),
    INDEPENDENCE_NOTICE,
  );
  check('/mentions-legales : adresse de contact', legal.includes(LEGAL.contactEmail));
  check('/mentions-legales : hébergeur', legal.includes(LEGAL.host.name));
  check('/mentions-legales : lien de parrainage signalé', legal.includes('lien de parrainage'));
  check(
    'pied de page : lien vers les mentions légales',
    (await (await fetch(`${BASE}/`)).text()).includes('href="/mentions-legales"'),
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
  const economy = await byTheme('economy');
  check(
    'interventions.list filtré par thème : renvoie l’intervention et ses thèmes',
    economy[0]?.id === id && economy[0]?.themes.join() === 'economy',
  );
  check(
    'interventions.list filtré par un autre thème : vide',
    (await byTheme('security')).length === 0,
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

  // Citations et recherche (spec intervention-quotes, ADR 0028).
  const quotePage = await fetch(`${BASE}/interventions/${id}/citation/125`);
  check('/interventions/<id>/citation/<t> : HTTP 200 (URL partageable)', quotePage.status === 200);
  checkPage('/interventions/<id>/citation/<t>', await quotePage.text(), null, INDEPENDENCE_NOTICE);
  const quoteAt = (await (await fetch(trpcUrl('quotes.at', { id, t: 127 }))).json()) as {
    result?: { data?: { startS?: number } | null };
  };
  check(
    'quotes.at : citation trouvée à quelques secondes près',
    quoteAt.result?.data?.startS === 125,
  );
  const found = (await (await fetch(trpcUrl('search.query', { q: 'ECOLE primaire' }))).json()) as {
    result?: { data?: { quotes?: { itemId: string }[] } };
  };
  check(
    'search.query : sans accents ni casse, renvoie la citation',
    found.result?.data?.quotes?.[0]?.itemId === id,
  );

  // Image de partage d'une citation (ADR 0029) : PNG carré de 1080 px, 404 sinon.
  const image = await fetch(`${BASE}/interventions/${id}/citation/125/image.png`);
  const png = new DataView(await image.arrayBuffer());
  check(
    'image de citation : PNG 1080 × 1080',
    image.status === 200 &&
      image.headers.get('content-type') === 'image/png' &&
      png.byteLength > 8 &&
      png.getUint32(0) === 0x89504e47 &&
      png.getUint32(16) === 1080 &&
      png.getUint32(20) === 1080,
  );
  const preview = await fetch(`${BASE}/interventions/${id}/citation/125/apercu.png`);
  const previewPng = new DataView(await preview.arrayBuffer());
  check(
    'aperçu de citation : PNG 1200 × 630',
    preview.status === 200 &&
      previewPng.byteLength > 24 &&
      previewPng.getUint32(16) === 1200 &&
      previewPng.getUint32(20) === 630,
  );
  // Aperçu du lien (ADR 0030) : en-tête réécrit, lisible sans JavaScript.
  const quoteHtml = await (
    await fetch(`${BASE}/interventions/${id}/citation/125`, {
      headers: { 'x-forwarded-proto': 'https', 'x-forwarded-host': 'play.example.test' },
    })
  ).text();
  check(
    'page de citation : titre de la citation et aperçu paysage',
    /<title[^>]*>« Il faut réformer l’école dès le primaire\. » · /.test(quoteHtml) &&
      quoteHtml.includes(
        `<meta property="og:image" content="https://play.projetlisnard.fr/interventions/${id}/citation/125/apercu.png?v=`,
      ) &&
      quoteHtml.includes('<meta name="twitter:card" content="summary_large_image"/>'),
  );
  const unknownQuote = await (await fetch(`${BASE}/interventions/${id}/citation/9999`)).text();
  check(
    'page de citation : description remplacée, une seule balise de chaque, aperçu en tête',
    quoteHtml.includes('content="David Lisnard sur ') &&
      !quoteHtml.includes('Toutes les interventions publiques') &&
      quoteHtml.split('property="og:image"').length === 2 &&
      quoteHtml.split('property="og:title"').length === 2 &&
      quoteHtml.split(/<meta charset/i).length === 2 &&
      quoteHtml.indexOf('og:image') < quoteHtml.indexOf('<style'),
  );
  const quotedHtml = await (await fetch(`${BASE}/interventions/${id}/citation/300`)).text();
  check(
    'page de citation : guillemets droits échappés dans l’en-tête',
    quotedHtml.includes('content="« Il a dit &quot;non&quot; & c’est tout. » · ') &&
      !quotedHtml.includes('content="« Il a dit "non"'),
  );
  check('page de citation inconnue : aperçu générique', !unknownQuote.includes('twitter:card'));
  const noImage = await fetch(`${BASE}/interventions/${id}/citation/9999/image.png`);
  check('image de citation inconnue : HTTP 404', noImage.status === 404);

  // Fichier de validation Google Search Console : à servir tel quel, sans jamais le retirer.
  const gsc = await fetch(`${BASE}/google2fcb3d6622939462.html`);
  check(
    'validation Search Console : fichier servi',
    gsc.status === 200 && (await gsc.text()).includes('google-site-verification'),
  );

  // Récapitulatifs (spec campaign-recaps, ADR 0031) : image et aperçu de la page.
  const recapPng = await fetch(`${BASE}/campagne/recap/jour/2026-06-01.png`);
  const recapView = new DataView(await recapPng.arrayBuffer());
  check(
    'image de récapitulatif : PNG 1200 × 630',
    recapPng.status === 200 &&
      recapView.byteLength > 24 &&
      recapView.getUint32(16) === 1200 &&
      recapView.getUint32(20) === 630,
  );
  check(
    'image de récapitulatif sans intervention : HTTP 404',
    (await fetch(`${BASE}/campagne/recap/jour/2026-06-02.png`)).status === 404,
  );
  const recapHtml = await (await fetch(`${BASE}/campagne?jour=2026-06-01`)).text();
  check(
    'page Campagne d’un récapitulatif : titre et aperçu',
    /<title[^>]*>La journée de David Lisnard, lundi 1er juin · /.test(recapHtml) &&
      recapHtml.includes(
        'content="https://play.projetlisnard.fr/campagne/recap/jour/2026-06-01.png?v=',
      ),
  );
  const plainCampaign = await (await fetch(`${BASE}/campagne?jour=2026-06-02`)).text();
  check(
    'page Campagne d’un jour sans intervention : aperçu ordinaire',
    !plainCampaign.includes('twitter:card'),
  );
  const recaps = (await (await fetch(trpcUrl('recap.list', undefined))).json()) as {
    result?: { data?: { days?: { day: string }[] } };
  };
  check(
    'recap.list : jour de l’intervention',
    recaps.result?.data?.days?.[0]?.day === '2026-06-01',
  );

  // Plan du site (spec app-shell) : adresses absolues sur le domaine demandé.
  const sitemap = await fetch(`${BASE}/sitemap.xml`, {
    headers: { 'x-forwarded-proto': 'https', 'x-forwarded-host': 'play.example.test' },
  });
  const sitemapXml = await sitemap.text();
  check(
    '/sitemap.xml : XML servi',
    sitemap.status === 200 && (sitemap.headers.get('content-type') ?? '').includes('xml'),
  );
  check(
    '/sitemap.xml : intervention publiée et ses citations, sur le domaine du proxy',
    sitemapXml.includes(`<loc>https://play.example.test/interventions/${id}</loc>`) &&
      sitemapXml.includes(`<loc>https://play.example.test/interventions/${id}/citation/125</loc>`),
  );

  // Notifications (spec push-notifications, ADR 0024).
  const sw = await fetch(`${BASE}/sw.js`);
  check(
    '/sw.js : service worker servi en JavaScript',
    sw.status === 200 && (sw.headers.get('content-type') ?? '').includes('javascript'),
  );
  const manifest = await fetch(`${BASE}/manifest`);
  const manifestJson = (await manifest.json().catch(() => ({}))) as {
    name?: string;
    display?: string;
  };
  const { APP_NAME } = await import('../apps/app/src/config/app');
  check(
    '/manifest : manifeste web (nom, affichage autonome)',
    manifest.status === 200 &&
      manifestJson.name === APP_NAME &&
      manifestJson.display === 'standalone',
  );
  check(
    'pages : lien vers le manifeste',
    (await (await fetch(`${BASE}/`)).text()).includes('rel="manifest"'),
  );
  const notifications = await fetch(`${BASE}/notifications`);
  check('/notifications : HTTP 200', notifications.status === 200);
  checkPage(
    '/notifications',
    await notifications.text(),
    pageTitle('Notifications'),
    INDEPENDENCE_NOTICE,
  );
  const config = (await (await fetch(`${BASE}/api/trpc/notifications.config`)).json()) as {
    result?: { data?: { vapidPublicKey?: string } };
  };
  check(
    'notifications.config : clé publique VAPID servie',
    config.result?.data?.vapidPublicKey === 'BSmokeVapidKey',
  );
  const subscribe = (body: unknown) =>
    fetch(`${BASE}/api/trpc/notifications.subscribe`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  const keys = { p256dh: 'B'.repeat(87), auth: 'a'.repeat(22) };
  check(
    'notifications.subscribe : adresse hors liste blanche refusée (400)',
    (await subscribe({ kind: 'web', endpoint: 'https://exemple.com/push', keys })).status === 400,
  );
  const endpoint = 'https://fcm.googleapis.com/fcm/send/smoke';
  check(
    'notifications.subscribe puis unsubscribe : abonnement enregistré et supprimé',
    (await subscribe({ kind: 'web', endpoint, keys })).status === 200 &&
      (
        await fetch(`${BASE}/api/trpc/notifications.unsubscribe`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ endpoint }),
        })
      ).status === 200,
  );

  // Onglet Campagne (specs membership-timeline, intervention-places).
  const campaignPage = await fetch(`${BASE}/campagne`);
  check('/campagne : HTTP 200', campaignPage.status === 200);
  checkPage('/campagne', await campaignPage.text(), pageTitle('Campagne'), INDEPENDENCE_NOTICE);
  check(
    '/campagne?vue=deplacements : HTTP 200',
    (await fetch(`${BASE}/campagne?vue=deplacements`)).status === 200,
  );
  check(
    '/adhesions (ancienne adresse) : servie, redirige côté client',
    (await fetch(`${BASE}/adhesions`)).status === 200,
  );
  const places = (await (await fetch(`${BASE}/api/trpc/campaign.places`)).json()) as {
    result?: { data?: { places?: { label: string; interventions: { id: string }[] }[] } };
  };
  check(
    'campaign.places : lieu regroupé avec son intervention',
    places.result?.data?.places?.[0]?.label === 'Saint-Raphaël' &&
      places.result.data.places[0].interventions[0]?.id === id,
  );
  const timeline = (await (await fetch(`${BASE}/api/trpc/membership.timeline`)).json()) as {
    result?: {
      data?: { total?: { members?: number }; interventions?: { id: string }[]; days?: unknown[] };
    };
  };
  check(
    'membership.timeline : total, jours et interventions',
    timeline.result?.data?.total?.members === 20500 &&
      timeline.result.data.interventions?.[0]?.id === id &&
      (timeline.result.data.days?.length ?? 0) > 0,
  );

  const malformed = await fetch(`${BASE}/%E0%A4%A`);
  check('URL mal encodée : pas d’erreur serveur', malformed.status < 500);

  const missing = await fetch(
    trpcUrl('interventions.byId', { id: '00000000-0000-0000-0000-000000000000' }),
  );
  check('interventions.byId inconnu : HTTP 404', missing.status === 404);

  // Indexation bloquée par défaut (spec app-shell) : pages, fichiers, API et robots.txt.
  const noindex = (res: Response) => res.headers.get('x-robots-tag') === 'noindex, nofollow';
  check('indexation bloquée : en-tête sur une page', noindex(await fetch(`${BASE}/`)));
  check('indexation bloquée : en-tête sur un fichier', noindex(await fetch(`${BASE}/favicon.ico`)));
  check('indexation bloquée : en-tête sur l’API', noindex(await fetch(`${BASE}/api/trpc/health`)));
  const robots = await (await fetch(`${BASE}/robots.txt`)).text();
  check('indexation bloquée : robots.txt interdit tout', robots.includes('Disallow: /'));

  // ALLOW_INDEXING=true : ni en-tête ni interdiction, sans reconstruction.
  const openBase = `http://localhost:${PORT + 1}`;
  const open = Bun.spawn(['bun', 'server.ts'], {
    cwd: APP_DIR,
    env: {
      ...process.env,
      PORT: String(PORT + 1),
      DATABASE_URL: url,
      NODE_ENV: 'production',
      ALLOW_INDEXING: 'true',
    },
    stdout: 'ignore',
    stderr: 'inherit',
  });
  try {
    await waitForServer(openBase);
    const page = await fetch(`${openBase}/`);
    check('indexation activée : pas d’en-tête X-Robots-Tag', !page.headers.has('x-robots-tag'));
    const allowed = await (await fetch(`${openBase}/robots.txt`)).text();
    check('indexation activée : robots.txt autorise', !allowed.includes('Disallow'));
    check(
      'indexation activée : robots.txt indique le plan du site',
      allowed.includes('Sitemap: http'),
    );
  } finally {
    open.kill();
    await open.exited;
  }
} finally {
  server.kill();
  await server.exited;
  membershipFixture.stop(true);
  await drop();
}

if (failures.length > 0) {
  console.error(`\n${failures.length} vérification(s) en échec.`);
  process.exit(1);
}
console.log('\nSmoke test web : OK');
process.exit(0);
