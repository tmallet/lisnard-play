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

/** La citation, `null` si elle est introuvable, `'error'` si l'API a échoué. */
export async function readQuote(
  api: Api,
  req: Request,
  params: { id: string; t: number },
): Promise<QuoteAt | null | 'error'> {
  const input = encodeURIComponent(JSON.stringify({ id: params.id, t: params.t }));
  const res = await api(
    new Request(`${new URL(req.url).origin}/api/trpc/quotes.at?input=${input}`),
  );
  if (!res.ok) return 'error';
  return ((await res.json()) as { result?: { data?: QuoteAt | null } }).result?.data ?? null;
}
