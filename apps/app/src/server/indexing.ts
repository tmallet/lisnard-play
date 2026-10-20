/**
 * Indexation par les moteurs de recherche (spec app-shell) : bloquée par défaut,
 * levée par ALLOW_INDEXING=true au démarrage du serveur, sans reconstruction.
 * Module sans dépendance, chargé par server.ts (hors bundle Expo).
 */

/** Seule la valeur exacte « true » lève le blocage : une faute de frappe le laisse en place. */
export function indexingAllowed(value: string | undefined): boolean {
  return value === 'true';
}

/** robots.txt ; une fois l'indexation activée, il indique le plan du site (adresse absolue). */
export function robotsTxt(allowed: boolean, origin?: string): string {
  if (!allowed) return 'User-agent: *\nDisallow: /\n';
  // Le backoffice (/admin) n'est jamais exploré, même quand le site est indexé.
  return `User-agent: *\nAllow: /\nDisallow: /admin\n${origin ? `Sitemap: ${origin}/sitemap.xml\n` : ''}`;
}

/**
 * Domaine public par lequel la requête est arrivée : le proxy (Caddy) pose
 * X-Forwarded-Proto et X-Forwarded-Host, le serveur ne voyant que du HTTP local.
 */
export function publicOrigin(req: Request): string {
  const url = new URL(req.url);
  const first = (name: string) => req.headers.get(name)?.split(',')[0]?.trim() || null;
  const proto = first('x-forwarded-proto') ?? url.protocol.replace(':', '');
  const host = first('x-forwarded-host') ?? req.headers.get('host') ?? url.host;
  return `${proto}://${host}`;
}

export const NOINDEX_HEADER = 'noindex, nofollow';

/** Ajoute X-Robots-Tag quand l'indexation est bloquée (réponse recopiée : en-têtes modifiables). */
export function withIndexingPolicy(response: Response, allowed: boolean): Response {
  if (allowed) return response;
  const copy = new Response(response.body, response);
  copy.headers.set('X-Robots-Tag', NOINDEX_HEADER);
  return copy;
}
