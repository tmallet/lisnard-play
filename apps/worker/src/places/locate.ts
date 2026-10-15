/**
 * Lieu des déplacements (ADR 0027) : le modèle lit le titre et la description, puis la
 * Base adresse nationale situe la commune. Réutilise le client et les erreurs des
 * résumés (même fournisseur, même plafond de dépense).
 */
import { InvalidSummaryResponse, SummaryServiceUnavailable } from '../summaries/openrouter';
import { SUMMARY_MODEL } from '../summaries/prompt';
import { PLACE_SCHEMA, type PlaceContext, placeInstructions } from './prompt';

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
const BAN = 'https://api-adresse.data.gouv.fr/search/';
/** Score minimal de la Base adresse nationale pour retenir une commune. */
const MIN_SCORE = 0.5;

export interface PlaceAnswer {
  onSite: boolean;
  city: string;
  department: string;
  precision: 'city' | 'department' | 'region' | 'country' | 'none';
}

export function parsePlaceAnswer(content: string | undefined): PlaceAnswer {
  const data = JSON.parse(content ?? '') as Record<string, unknown>;
  const precision = data.precision;
  if (
    typeof data.on_site !== 'boolean' ||
    typeof data.city !== 'string' ||
    typeof data.department !== 'string' ||
    !['city', 'department', 'region', 'country', 'none'].includes(String(precision))
  )
    throw new Error('réponse invalide : lieu');
  const onSite = data.on_site && precision !== 'none' && data.city.trim() !== '';
  return {
    onSite,
    city: onSite ? data.city.trim() : '',
    department: onSite ? data.department.trim() : '',
    precision: onSite ? (precision as PlaceAnswer['precision']) : 'none',
  };
}

export interface Locator {
  readonly model: string;
  ask(context: PlaceContext): Promise<{ answer: PlaceAnswer; model: string; cost: number }>;
}

export function createOpenRouterLocator(options: {
  apiKey: string;
  model?: string;
  fetch?: typeof fetch;
}): Locator {
  const doFetch = options.fetch ?? fetch;
  const model = options.model ?? SUMMARY_MODEL;
  return {
    model,
    async ask(context) {
      const res = await doFetch(ENDPOINT, {
        method: 'POST',
        headers: { Authorization: `Bearer ${options.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          provider: { only: ['google-ai-studio'], allow_fallbacks: false },
          usage: { include: true },
          temperature: 0,
          response_format: {
            type: 'json_schema',
            json_schema: { name: 'intervention_place', strict: true, schema: PLACE_SCHEMA },
          },
          messages: [{ role: 'user', content: placeInstructions(context) }],
        }),
        signal: AbortSignal.timeout(30_000),
      });
      if (res.status === 402 || res.status === 429 || res.status >= 500)
        throw new SummaryServiceUnavailable(`OpenRouter : HTTP ${res.status}`);
      if (!res.ok) throw new Error(`OpenRouter : HTTP ${res.status}`);
      const body = (await res.json()) as {
        model?: string;
        choices?: { message?: { content?: string } }[];
        usage?: { cost?: number };
      };
      const cost = body.usage?.cost ?? 0;
      try {
        return {
          answer: parsePlaceAnswer(body.choices?.[0]?.message?.content),
          model: body.model ?? model,
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

export interface GeocodedCity {
  city: string;
  lat: number;
  lon: number;
}

/** Comparaison insensible aux accents, à la casse et à la ponctuation. */
const plain = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/**
 * Commune française par la Base adresse nationale (adresse fixe ; le lieu n'est qu'un
 * paramètre de requête). La recherche porte sur le seul nom de la commune : y ajouter le
 * département fait chuter le score. Le département, s'il est connu, départage ensuite
 * les homonymes (Saint-Denis…) grâce au contexte renvoyé.
 */
export async function geocodeCity(
  city: string,
  department: string,
  fetchFn: typeof fetch = fetch,
): Promise<GeocodedCity | null> {
  const url = new URL(BAN);
  url.searchParams.set('q', city);
  url.searchParams.set('type', 'municipality');
  url.searchParams.set('limit', '5');
  const res = await fetchFn(url, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`Base adresse nationale : HTTP ${res.status}`);
  const body = (await res.json()) as {
    features?: {
      geometry?: { coordinates?: [number, number] };
      properties?: { city?: string; name?: string; score?: number; context?: string };
    }[];
  };
  const candidates = (body.features ?? []).filter((f) => (f.properties?.score ?? 0) >= MIN_SCORE);
  const wanted = plain(department);
  const best =
    (wanted && candidates.find((f) => plain(f.properties?.context ?? '').includes(wanted))) ||
    candidates[0];
  const [lon, lat] = best?.geometry?.coordinates ?? [];
  if (!best || lon === undefined || lat === undefined) return null;
  return { city: best.properties?.name ?? best.properties?.city ?? city, lat, lon };
}
