import {
  type AppliedThresholds,
  type ClassifierAnswers,
  THEMES,
  type Theme,
} from '@lisnard/db/schema';

import type { Kind, Role } from './questions';
import { DEFAULT_THEME_THRESHOLD } from './thresholds';

export interface Decision {
  outcome: 'published' | 'rejected';
  role: Role;
  kind: Kind;
  themes: Theme[];
}

export interface DecideOptions {
  /**
   * Contenu de sa chaîne officielle : il y intervient par construction, le seuil
   * « intervient » ne s'applique pas ; le filtre sur le rôle reste (ADR 0018).
   */
  presumeSpeaking?: boolean;
}

/** Périmètre de la campagne présidentielle : ni AMF ni mairie (ADR 0020). */
const PUBLISHABLE_ROLES: readonly Role[] = ['national'];

/**
 * Règle de publication (spec intervention-classification, ADR 0018 et 0020) : publié si
 * et seulement si intervient ≥ τ_intervient (sauf chaîne officielle), rôle le plus
 * probable national et confiance ≥ τ_role. Sans seuils pour le modèle, rien n'est
 * publié. Les thèmes (≥ τ_theme) sont calculés dans tous les cas et n'influencent
 * pas la publication (spec intervention-themes).
 */
export function decide(
  answers: ClassifierAnswers,
  thresholds: AppliedThresholds | null,
  { presumeSpeaking = false }: DecideOptions = {},
): Decision {
  const role = answers.role.choice as Role;
  const kind = answers.kind.choice as Kind;
  const publish =
    thresholds !== null &&
    (presumeSpeaking || answers.intervient >= thresholds.intervient) &&
    PUBLISHABLE_ROLES.includes(role) &&
    answers.role.confidence >= thresholds.role;
  const themeThreshold = thresholds?.theme ?? DEFAULT_THEME_THRESHOLD;
  const themes = THEMES.filter((t) => (answers.themes?.[t] ?? 0) >= themeThreshold);
  return { outcome: publish ? 'published' : 'rejected', role, kind, themes };
}
