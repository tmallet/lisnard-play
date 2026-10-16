/**
 * Client REST minimal de l'API System One d'OpenRouter (ADR 0004, spike du 2026-10-13).
 * POST /api/v1/systemone : { model, state, questions } → { model, answers, usage }.
 */
import { type ClassifierAnswers, THEMES, type Theme } from '@lisnard/db/schema';

import { KINDS, QUESTIONS, ROLES, themeQuestionKey } from './questions';
import type { Classifier, ClassifierResult, ClassifierState } from './types';

export const SYSTEM_ONE_ENDPOINT = 'https://openrouter.ai/api/v1/systemone';
const ENDPOINT = SYSTEM_ONE_ENDPOINT;

/** Instantané épinglé (ADR 0004) : jamais d'alias « latest ». */
export const PINNED_MODEL = 'typesafe/jev-1.13-20260917';

interface ChoiceAnswer {
  type: 'choice';
  choice: string;
  probabilities: Record<string, number>;
  confidence: number;
}

interface ApiResponse {
  model?: string;
  answers?: {
    intervient?: { type: 'noul'; noul: number };
    role?: ChoiceAnswer;
    kind?: ChoiceAnswer;
  } & { [key: `theme_${string}`]: { type: 'noul'; noul: number } | undefined };
  usage?: { cost?: number };
}

const isProbability = (n: unknown): n is number => typeof n === 'number' && n >= 0 && n <= 1;

/** Valide la réponse ; toute forme inattendue est une erreur (le contenu reste en attente). */
export function parseAnswers(body: ApiResponse): ClassifierAnswers {
  const a = body.answers;
  const intervient = a?.intervient?.noul;
  const role = a?.role;
  const kind = a?.kind;
  if (!isProbability(intervient)) throw new Error('réponse invalide : intervient');
  if (
    !role ||
    !(ROLES as readonly string[]).includes(role.choice) ||
    !isProbability(role.confidence)
  )
    throw new Error('réponse invalide : role');
  if (
    !kind ||
    !(KINDS as readonly string[]).includes(kind.choice) ||
    !isProbability(kind.confidence)
  )
    throw new Error('réponse invalide : kind');
  return {
    intervient,
    role: {
      choice: role.choice,
      confidence: role.confidence,
      probabilities: role.probabilities ?? {},
    },
    kind: {
      choice: kind.choice,
      confidence: kind.confidence,
      probabilities: kind.probabilities ?? {},
    },
    themes: parseThemes(a),
  };
}

/** Thèmes : une réponse absente ou invalide est ignorée, sans faire échouer la décision. */
function parseThemes(a: ApiResponse['answers']): Partial<Record<Theme, number>> {
  const themes: Partial<Record<Theme, number>> = {};
  for (const theme of THEMES) {
    const p = a?.[themeQuestionKey(theme)]?.noul;
    if (isProbability(p)) themes[theme] = p;
  }
  return themes;
}

export function createSystemOneClassifier(options: {
  apiKey: string;
  model?: string;
  fetch?: typeof fetch;
}): Classifier {
  const model = options.model ?? PINNED_MODEL;
  const doFetch = options.fetch ?? fetch;
  return {
    model,
    async classify(state: ClassifierState): Promise<ClassifierResult> {
      const res = await doFetch(ENDPOINT, {
        method: 'POST',
        headers: { Authorization: `Bearer ${options.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, state: JSON.stringify(state), questions: QUESTIONS }),
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) throw new Error(`System One : HTTP ${res.status}`);
      const body = (await res.json()) as ApiResponse;
      return {
        model: body.model ?? model,
        answers: parseAnswers(body),
        cost: body.usage?.cost ?? 0,
      };
    },
  };
}
