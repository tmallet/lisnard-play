import type { AppliedThresholds, ClassifierAnswers } from '@lisnard/db/schema';

import type { Kind, Role } from './questions';

export interface Decision {
  outcome: 'published' | 'rejected';
  role: Role;
  kind: Kind;
}

const PUBLISHABLE_ROLES: readonly Role[] = ['national', 'amf'];

/**
 * Règle de publication (spec intervention-classification) : publié si et seulement si
 * intervient ≥ τ_intervient, rôle le plus probable national ou amf, et confiance ≥ τ_role.
 * Sans seuils pour le modèle, rien n'est publié.
 */
export function decide(answers: ClassifierAnswers, thresholds: AppliedThresholds | null): Decision {
  const role = answers.role.choice as Role;
  const kind = answers.kind.choice as Kind;
  const publish =
    thresholds !== null &&
    answers.intervient >= thresholds.intervient &&
    PUBLISHABLE_ROLES.includes(role) &&
    answers.role.confidence >= thresholds.role;
  return { outcome: publish ? 'published' : 'rejected', role, kind };
}
