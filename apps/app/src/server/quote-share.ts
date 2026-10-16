/**
 * Lecture d'une citation par l'API (`quotes.at`), appelée en interne sans réseau, pour
 * l'image (ADR 0029) et l'aperçu de la page (ADR 0030) : server.ts n'accède jamais
 * directement à la base.
 */
export interface QuoteAt {
  itemId: string;
  text: string;
  startS: number;
  theme: string | null;
  outlet: string;
  official: boolean;
  durationS: number | null;
  day: string;
}

export type Api = (req: Request) => Promise<Response>;

/** Requête tRPC interne : la donnée, `null` si absente, `'error'` si l'API a échoué. */
export async function callQuery<T>(
  api: Api,
  req: Request,
  procedure: string,
  input: unknown,
): Promise<T | null | 'error'> {
  const query = encodeURIComponent(JSON.stringify(input));
  const res = await api(
    new Request(`${new URL(req.url).origin}/api/trpc/${procedure}?input=${query}`),
  );
  if (!res.ok) return 'error';
  return ((await res.json()) as { result?: { data?: T | null } }).result?.data ?? null;
}

/** La citation, `null` si elle est introuvable, `'error'` si l'API a échoué. */
export const readQuote = (api: Api, req: Request, params: { id: string; t: number }) =>
  callQuery<QuoteAt>(api, req, 'quotes.at', { id: params.id, t: params.t });
