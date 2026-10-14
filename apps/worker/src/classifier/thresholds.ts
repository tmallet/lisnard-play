import type { AppliedThresholds } from '@lisnard/db/schema';

/**
 * Seuils par modèle (ADR 0004, ADR 0018, ADR 0020). Un modèle absent de cette table ne
 * publie rien. intervient et role : calibration du 2026-10-13 sur le jeu de référence
 * validé (précision 98 %, rappel 82,8 %). theme : valeur initiale du design D4 de
 * campaign-themes, vérifiée sur un échantillon validé.
 * Procédure et résultats : docs/architecture/classifier.md.
 */
/**
 * Seuil des thèmes (design D4 de campaign-themes) : valeur du modèle épinglé, et repli
 * pour une décision sans seuils (modèle inconnu, journal antérieur aux thèmes).
 */
export const DEFAULT_THEME_THRESHOLD = 0.5;

export const THRESHOLDS: Record<string, AppliedThresholds> = {
  'typesafe/jev-1.13-20260917': { intervient: 0.75, role: 0.6, theme: DEFAULT_THEME_THRESHOLD },
};

export function thresholdsFor(model: string): AppliedThresholds | null {
  return THRESHOLDS[model] ?? null;
}
