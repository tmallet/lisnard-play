/**
 * Après chaque test : îlots démontés, puis client d'API et globales simulées remis à
 * zéro (dans cet ordre : une requête partie après coup atteindrait le vrai réseau).
 */
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

import { resetApiClients } from '@/lib/trpc';

afterEach(async () => {
  cleanup();
  resetApiClients();
  // Un lot tRPC déjà formé part au tour suivant : il doit encore trouver l'API simulée.
  await new Promise((resolve) => setTimeout(resolve, 20));
  vi.unstubAllGlobals();
});
