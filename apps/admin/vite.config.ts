import { fileURLToPath } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/** Interface du backoffice (ADR 0032) : servie par le service admin sous /admin. */
export default defineConfig({
  base: '/admin/',
  root: fileURLToPath(new URL('./ui', import.meta.url)),
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./ui/src', import.meta.url)) } },
  build: { outDir: fileURLToPath(new URL('./dist', import.meta.url)), emptyOutDir: true },
  // Développement : l'API du service admin tourne sur le port 3001.
  server: { port: 5174, proxy: { '/admin/api': 'http://localhost:3001' } },
});
