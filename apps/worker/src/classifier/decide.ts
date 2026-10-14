import type { AppliedThresholds, ClassifierAnswers } from '@lisnard/db/schema';

import type { Kind, Role } from './questions';

export interface Decision {
  outcome: 'published' | 'rejected';
  role: Role;
  kind: Kind;
}

export interface DecideOptions {
  /**
   * Contenu de sa chaîne officielle : il y intervient par construction, le seuil
   * « intervient » ne s'applique pas ; le filtre sur le rôle reste (ADR 0018).
   */
  presumeSpeaking?: boolean;
}

const PUBLISHABLE_ROLES: readonly Role[] = ['national', 'amf'];

/**
 * Règle de publication (spec intervention-classification, ADR 0018) : publié si et
 * seulement si intervient ≥ τ_intervient (sauf chaîne officielle), rôle le plus probable
 * national ou amf, et confiance ≥ τ_role. Sans seuils pour le modèle, rien n'est publié.
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
  return { outcome: publish ? 'published' : 'rejected', role, kind };
}
