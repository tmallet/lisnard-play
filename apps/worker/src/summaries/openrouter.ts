/**
 * Client des résumés : Gemini via OpenRouter (ADR 0021). La vidéo YouTube est passée
 * par URL (contenu video_url) ; la réponse est une sortie structurée validée ici.
 */
import { SUMMARY_MODEL, SUMMARY_SCHEMA, type SummaryContext, summaryInstructions } from './prompt';

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

export interface SummaryOutput {
  speaks: boolean;
  summary: string;
  points: string[];
}

export interface SummaryResult {
  model: string;
  output: SummaryOutput;
  cost: number;
}

export interface SummaryTargetInput extends SummaryContext {
  url: string;
}

/** Seule dépendance du reste du worker envers le modèle de résumé. */
export interface Summarizer {
  readonly model: string;
  summarize(target: SummaryTargetInput): Promise<SummaryResult>;
}

interface ApiResponse {
  model?: string;
  choices?: { message?: { content?: string } }[];
  usage?: { cost?: number };
}

const MAX_SUMMARY_CHARS = 900;

/** Valide la sortie du modèle ; toute forme inattendue est une erreur (nouvelle tentative). */
export function parseSummaryOutput(content: string | undefined): SummaryOutput {
  const data = JSON.parse(content ?? '') as Partial<SummaryOutput>;
  if (typeof data.speaks !== 'boolean') throw new Error('réponse invalide : speaks');
  if (!data.speaks) return { speaks: false, summary: '', points: [] };
  const summary = typeof data.summary === 'string' ? data.summary.trim() : '';
  const points = Array.isArray(data.points)
    ? data.points.filter((p): p is string => typeof p === 'string' && p.trim() !== '')
    : [];
  if (!summary || summary.length > MAX_SUMMARY_CHARS) throw new Error('réponse invalide : summary');
  if (points.length === 0) throw new Error('réponse invalide : points');
  return { speaks: true, summary, points: points.slice(0, 4).map((p) => p.trim()) };
}

export function createOpenRouterSummarizer(options: {
  apiKey: string;
  model?: string;
  fetch?: typeof fetch;
}): Summarizer {
  const model = options.model ?? SUMMARY_MODEL;
  const doFetch = options.fetch ?? fetch;
  return {
    model,
    async summarize(target) {
      const res = await doFetch(ENDPOINT, {
        method: 'POST',
        headers: { Authorization: `Bearer ${options.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          provider: { only: ['google-ai-studio'], allow_fallbacks: false },
          usage: { include: true },
          response_format: {
            type: 'json_schema',
            json_schema: { name: 'video_summary', strict: true, schema: SUMMARY_SCHEMA },
          },
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: summaryInstructions(target) },
                { type: 'video_url', video_url: { url: target.url } },
              ],
            },
          ],
        }),
        // Une vidéo longue prend environ 35 s (essai du 2026-10-13).
        signal: AbortSignal.timeout(180_000),
      });
      if (!res.ok) throw new Error(`OpenRouter : HTTP ${res.status}`);
      const body = (await res.json()) as ApiResponse;
      return {
        model: body.model ?? model,
        output: parseSummaryOutput(body.choices?.[0]?.message?.content),
        cost: body.usage?.cost ?? 0,
      };
    },
  };
}
