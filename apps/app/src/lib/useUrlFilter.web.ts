import { useEffect, useState } from 'react';

/**
 * Web : filtre lu dans l'adresse et réécrit sans recharger, pour partager une vue filtrée.
 * Lu après le montage : le HTML pré-rendu (ADR 0011) ne connaît pas l'adresse.
 * Valeur absente ou inconnue : repli ; le repli n'apparaît jamais dans l'adresse.
 */
export function useUrlFilter<T extends string>(key: string, fallback: T, allowed: readonly T[]) {
  const [value, setValue] = useState<T>(fallback);
  // biome-ignore lint/correctness/useExhaustiveDependencies: lecture unique au montage
  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get(key) as T | null;
    if (raw && allowed.includes(raw)) setValue(raw);
  }, []);
  const update = (next: T) => {
    setValue(next);
    const url = new URL(window.location.href);
    if (next === fallback) url.searchParams.delete(key);
    else url.searchParams.set(key, next);
    window.history.replaceState(window.history.state, '', url);
  };
  return [value, update] as const;
}
