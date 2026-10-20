/**
 * Relais de /admin vers le service d'administration (ADR 0032), par le réseau interne :
 * méthode, en-têtes (cookies compris), corps et réponse transmis tels quels. Le serveur
 * public ne touche ni à la session ni à la base.
 */
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
