/**
 * Relais de /admin vers le service d'administration (ADR 0032), par le réseau interne :
 * méthode, en-têtes (cookies compris), corps et réponse transmis tels quels. Le serveur
 * public ne touche ni à la session ni à la base.
 */
/**
 * Numéro de PR d'une prévisualisation Coolify, tiré du nom du conteneur
 * (`<uuid>-pr-<n°>`), substitué à `{pr}` : la variable se règle une fois pour toutes
 * les PR (`http://<uuid-admin>-pr-{pr}:3001`). Sans numéro, `{pr}` laisse la variable
 * inutilisable plutôt que de viser un autre service.
 */
export function withPreviewNumber(
  value: string | undefined,
  containerName: string | undefined,
): string | undefined {
  if (!value?.includes('{pr}')) return value;
  const pr = containerName?.match(/-pr-(\d+)$/)?.[1];
  return pr ? value.replaceAll('{pr}', pr) : undefined;
}

export const isAdminPath = (pathname: string) =>
  pathname === '/admin' || pathname.startsWith('/admin/');

export async function relayToAdmin(req: Request, adminUrl: string | undefined): Promise<Response> {
  if (!adminUrl) return new Response('Backoffice non configuré', { status: 503 });
  const url = new URL(req.url);
  const target = new URL(`${url.pathname}${url.search}`, adminUrl);
  const headers = new Headers(req.headers);
  headers.delete('host');
  try {
    return await fetch(target, {
      method: req.method,
      headers,
      body: req.method === 'GET' || req.method === 'HEAD' ? undefined : req.body,
      redirect: 'manual',
      // Corps transmis en flux : option exigée par la norme fetch pour un corps de requête.
      duplex: 'half',
    } as RequestInit);
  } catch {
    return new Response('Backoffice indisponible', { status: 503 });
  }
}
