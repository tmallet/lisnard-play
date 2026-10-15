/**
 * Client des résumés : Gemini via OpenRouter (ADR 0021). La vidéo YouTube est passée
 * par URL (contenu video_url) ; la réponse est une sortie structurée validée ici.
 */
import { isTheme } from '@lisnard/db/schema';

import {
  SUMMARY_MODEL,
  SUMMARY_SCHEMA,
  type SummaryContext,
  summaryInstructions,
  summaryModelFor,
} from './prompt';

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

/**
 * Indisponibilité qui ne tient pas à la vidéo : crédit épuisé (402), limite de débit
 * (429), panne du fournisseur (5xx). Le cycle s'arrête sans compter de tentative.
 */
export class SummaryServiceUnavailable extends Error {}

/** Réponse payée mais inexploitable : son coût compte quand même dans le plafond. */
export class InvalidSummaryResponse extends Error {
  constructor(
    message: string,
    readonly cost: number,
  ) {
    super(message);
  }
}

export interface QuoteOutput {
  text: string;
  startS: number;
  theme: string | null;
}

export interface SummaryOutput {
  speaks: boolean;
  summary: string;
  points: string[];
  quotes: QuoteOutput[];
}

/** « 12:34 » ou « 1:02:03 » en secondes ; null si le format est inattendu. */
export function parseTimestamp(value: string): number | null {
  const parts = value.trim().split(':');
  if (parts.length < 2 || parts.length > 3) return null;
  // Minutes sur trois chiffres en MM:SS (« 105:20 ») : vidéos de plus de 99 minutes.
  const lead = parts.length === 2 ? /^\d{1,3}$/ : /^\d{1,2}$/;
  if (!lead.test(parts[0] ?? '') || parts.slice(1).some((p) => !/^\d{2}$/.test(p))) return null;
  const [s = 0, m = 0, h = 0] = parts.map(Number).reverse();
  if (s >= 60 || (parts.length === 3 && m >= 60)) return null;
  return h * 3600 + m * 60 + s;
}

const MAX_QUOTE_WORDS = 60;

/**
 * Citations valides seulement (ADR 0028) : minutage lisible et dans la vidéo, texte non
 * vide et pas trop long, sans doublon ; au plus 8. Une citation invalide est ignorée
 * sans invalider le résumé.
 */
function parseQuotes(raw: unknown, durationS: number | null): QuoteOutput[] {
  if (!Array.isArray(raw)) return [];
  const quotes: QuoteOutput[] = [];
  for (const q of raw as Record<string, unknown>[]) {
    const text = typeof q?.text === 'string' ? q.text.trim() : '';
    const startS = typeof q?.start === 'string' ? parseTimestamp(q.start) : null;
    if (!text || startS === null) continue;
    if (text.split(/\s+/).length > MAX_QUOTE_WORDS) continue;
    if (durationS !== null && startS > durationS) continue;
    if (quotes.some((o) => o.text === text || o.startS === startS)) continue;
    const theme = typeof q.theme === 'string' && isTheme(q.theme) ? q.theme : null;
    quotes.push({ text, startS, theme });
  }
  return quotes.slice(0, 8);
}

export interface SummaryResult {
  model: string;
  output: SummaryOutput;
  cost: number;
}

export interface SummaryTargetInput extends SummaryContext {
  url: string;
  durationS: number | null;
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

/** Trois courts paragraphes au plus (consigne v2). */
const MAX_SUMMARY_CHARS = 2500;

/** Valide la sortie du modèle ; toute forme inattendue est une erreur (nouvelle tentative). */
export function parseSummaryOutput(
  content: string | undefined,
  durationS: number | null = null,
): SummaryOutput {
  const data = JSON.parse(content ?? '') as Partial<Omit<SummaryOutput, 'quotes'>> & {
    quotes?: unknown;
  };
  if (typeof data.speaks !== 'boolean') throw new Error('réponse invalide : speaks');
  if (!data.speaks) return { speaks: false, summary: '', points: [], quotes: [] };
  const summary = typeof data.summary === 'string' ? data.summary.trim() : '';
  const points = Array.isArray(data.points)
    ? data.points.filter((p): p is string => typeof p === 'string' && p.trim() !== '')
    : [];
  if (!summary || summary.length > MAX_SUMMARY_CHARS) throw new Error('réponse invalide : summary');
  if (points.length === 0) throw new Error('réponse invalide : points');
  return {
    speaks: true,
    summary,
    points: points.slice(0, 6).map((p) => p.trim()),
    quotes: parseQuotes(data.quotes, durationS),
  };
}

/**
 * Le modèle dépend de la durée de la vidéo (summaryModelFor), sauf si un modèle est
 * imposé (comparaison de modèles).
 */
export function createOpenRouterSummarizer(options: {
  apiKey: string;
  model?: string;
  fetch?: typeof fetch;
}): Summarizer {
  const doFetch = options.fetch ?? fetch;
  return {
    model: options.model ?? SUMMARY_MODEL,
    async summarize(target) {
      const model = options.model ?? summaryModelFor(target.durationS);
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
      if (res.status === 402 || res.status === 429 || res.status >= 500)
        throw new SummaryServiceUnavailable(`OpenRouter : HTTP ${res.status}`);
      if (!res.ok) throw new Error(`OpenRouter : HTTP ${res.status}`);
      const body = (await res.json()) as ApiResponse;
      const cost = body.usage?.cost ?? 0;
      try {
        return {
          model: body.model ?? model,
          output: parseSummaryOutput(body.choices?.[0]?.message?.content, target.durationS),
          cost,
        };
      } catch (error) {
        throw new InvalidSummaryResponse(
          error instanceof Error ? error.message : String(error),
          cost,
        );
      }
    },
  };
}
