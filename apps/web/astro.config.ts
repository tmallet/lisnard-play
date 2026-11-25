import node from '@astrojs/node';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

/**
 * Site web rendu par le serveur à chaque requête (ADR 0037) : adaptateur Node en mode
 * autonome (fichiers statiques et pages), enveloppé par `server.mjs` et exécuté sous le
 * runtime Bun (`bun --bun`) pour garder `Bun.sql` (ADR 0014).
 * Îlots React pour ce qui exige du JavaScript ; le reste est du HTML sans script.
 */
export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [react()],
  // Adresse publique : canoniques et aperçus ne sont jamais tirés de la requête.
  site: process.env.SITE_URL ?? 'https://play.projetlisnard.fr',
  trailingSlash: 'ignore',
  devToolbar: { enabled: false },
  // Ancienne adresse de l'onglet « Adhésions », devenu « Campagne » (ADR 0027).
  redirects: { '/adhesions': { status: 301, destination: '/campagne' } },
  server: { port: Number(process.env.PORT ?? 4321), host: true },
  // Formulaires : la recherche et les filtres passent par GET, rien à protéger ici ; le
  // contrôle d'origine d'Astro bloquerait les POST tRPC relayés par le proxy.
  security: { checkOrigin: false },
  vite: {
    // Types de Vite dédoublés (Astro et @tailwindcss/vite n'épinglent pas le même) : le
    // plugin est compatible à l'exécution.
    plugins: [tailwindcss() as never],
    // Code serveur empaqueté avec ses dépendances : l'image n'a besoin que de resvg (binaire
    // natif) et des polices des images. `bun` (Bun.sql) est un module du runtime.
    ssr: { noExternal: true, external: ['bun', '@resvg/resvg-js', '@fontsource/montserrat'] },
  },
});
