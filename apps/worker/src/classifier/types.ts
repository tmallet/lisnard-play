import type { ClassifierAnswers } from '@lisnard/db/schema';

/** État envoyé au classifieur : métadonnées déterministes uniquement (ADR 0004). */
export interface ClassifierState {
  title: string;
  description: string;
  outlet: string;
  sourceKind: 'youtube' | 'rss';
  publishedAt: string;
  startsAt: string | null;
}

export interface ClassifierResult {
  /** Instantané effectivement servi, journalisé. */
  model: string;
  answers: ClassifierAnswers;
  cost: number;
}

/** Seule dépendance du reste du worker envers le modèle (design D4). */
export interface Classifier {
  readonly model: string;
  classify(state: ClassifierState): Promise<ClassifierResult>;
}
