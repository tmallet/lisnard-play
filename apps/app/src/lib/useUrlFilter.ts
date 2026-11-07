import { useState } from 'react';

/** Natif : filtre en mémoire, pas d'adresse à refléter. */
export function useUrlFilter<T extends string>(_key: string, fallback: T, _allowed: readonly T[]) {
  return useState<T>(fallback);
}
