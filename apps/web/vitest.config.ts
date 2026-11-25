import { getViteConfig } from 'astro/config';
import type { ViteUserConfig } from 'vitest/config';

/**
 * Tests du site (Vitest) : modules purs, composants Astro rendus par l'API Container et
 * îlots React sous happy-dom (en-tête `@vitest-environment happy-dom` du fichier).
 */
const config: ViteUserConfig = {
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    globals: true,
    restoreMocks: true,
    setupFiles: ['src/test/setup.ts'],
  },
};

// Types de Vite dédoublés (Astro et Vitest n'épinglent pas le même) : configuration
// compatible à l'exécution.
export default getViteConfig(config as never);
