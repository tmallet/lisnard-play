/**
 * Indexation par les moteurs de recherche (spec app-shell) : bloquée par défaut, levée
 * par ALLOW_INDEXING=true sur le seul domaine de production, sans reconstruction.
 */

/** Seule la valeur exacte « true » lève le blocage : une faute de frappe le laisse en place. */
export function indexingAllowed(value: string | undefined): boolean {
  return value === 'true';
}

/** Domaine par lequel la requête est arrivée (proxy : X-Forwarded-Host, sinon Host). */
export function requestHost(headers: { get(name: string): string | null }): string | null {
  return (headers.get('x-forwarded-host') ?? headers.get('host'))?.split(',')[0]?.trim() || null;
}

/**
 * Indexation d'une requête : ALLOW_INDEXING=true **et** domaine de production. Une
 * prévisualisation servie sur un autre domaine n'est jamais indexée, quelle que soit sa
 * configuration (copie des variables de la production comprise).
 */
export function indexingAllowedFor(
  value: string | undefined,
  host: string | null,
  productionHost: string,
): boolean {
  return indexingAllowed(value) && host === productionHost;
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
