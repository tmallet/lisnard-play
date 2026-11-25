/**
 * Serveur de production (ADR 0015, 0037) : sert le build Astro (`dist/`), fichiers statiques
 * et pages, par le gestionnaire de l'adaptateur Node (mode autonome, sans son serveur à
 * lui). Usage : bun --bun server.mjs (PORT, défaut 3000 ; HOST, défaut 0.0.0.0).
 *
 * L'en-tête de non-indexation est posé ici, avant tout traitement : il vaut aussi pour
 * les fichiers statiques, que le middleware d'Astro ne voit pas (spec app-shell). Seul le
 * domaine de production (SITE_URL) peut être indexé : une prévisualisation ne l'est jamais.
 */
import { createServer } from 'node:http';

// Le gestionnaire seul : l'adaptateur ne démarre pas son propre serveur.
process.env.ASTRO_NODE_AUTOSTART = 'disabled';
const { handler } = await import('./dist/server/entry.mjs');

const ALLOW_INDEXING = process.env.ALLOW_INDEXING === 'true';
const PRODUCTION_HOST = new URL(process.env.SITE_URL ?? 'https://play.projetlisnard.fr').host;
const hostOf = (req) =>
  String(req.headers['x-forwarded-host'] ?? req.headers.host ?? '')
    .split(',')[0]
    .trim();
const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? '0.0.0.0';

const server = createServer((req, res) => {
  if (!ALLOW_INDEXING || hostOf(req) !== PRODUCTION_HOST)
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  // Fichiers d'Astro au nom versionné : gardés un an par les navigateurs.
  if (req.url?.startsWith('/_astro/'))
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  handler(req, res);
});

server.listen(port, host, () => {
  console.log(JSON.stringify({ msg: 'serveur démarré', port, host, indexing: ALLOW_INDEXING }));
});

for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => server.close(() => process.exit(0)));
