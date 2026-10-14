import type { AppliedThresholds } from '@lisnard/db/schema';

/**
 * Seuils de publication par modèle (ADR 0004, ADR 0005). Un modèle absent de cette
 * table ne publie rien. Valeurs issues de la calibration du 2026-10-13 sur le jeu de
 * référence validé (questions v2) : précision 98 %, rappel 82,8 %.
 * Procédure et résultats : docs/architecture/classifier.md.
 */
export const THRESHOLDS: Record<string, AppliedThresholds> = {
  'typesafe/jev-1.13-20260917': { intervient: 0.75, role: 0.6 },
};

export function thresholdsFor(model: string): AppliedThresholds | null {
  return THRESHOLDS[model] ?? null;
}
