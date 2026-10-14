/**
 * Indexation par les moteurs de recherche (spec app-shell) : bloquée par défaut,
 * levée par ALLOW_INDEXING=true au démarrage du serveur, sans reconstruction.
 * Module sans dépendance, chargé par server.ts (hors bundle Expo).
 */

/** Seule la valeur exacte « true » lève le blocage : une faute de frappe le laisse en place. */
export function indexingAllowed(value: string | undefined): boolean {
  return value === 'true';
}

export function robotsTxt(allowed: boolean): string {
  return allowed ? 'User-agent: *\nAllow: /\n' : 'User-agent: *\nDisallow: /\n';
}

export const NOINDEX_HEADER = 'noindex, nofollow';

/** Ajoute X-Robots-Tag quand l'indexation est bloquée (réponse recopiée : en-têtes modifiables). */
export function withIndexingPolicy(response: Response, allowed: boolean): Response {
  if (allowed) return response;
  const copy = new Response(response.body, response);
  copy.headers.set('X-Robots-Tag', NOINDEX_HEADER);
  return copy;
}
