import { defineMiddleware } from 'astro:middleware';

import { indexingAllowed, NOINDEX_HEADER } from '@/server/indexing';

/**
 * Pages publiques : un cache court permet à un futur proxy de les resservir (design du
 * change migrate-web-astro) ; les îlots rafraîchissent eux-mêmes les directs.
 */
const PAGE_CACHE = 'public, max-age=60, stale-while-revalidate=300';

/**
 * En-têtes communs (spec app-shell) :
 * - sans ALLOW_INDEXING=true, toute réponse porte `X-Robots-Tag: noindex, nofollow` ; lue
 *   à chaque requête, la règle change sans reconstruction. Une page 404 n'est jamais indexée ;
 * - cache court des pages HTML réussies, hors backoffice.
 */
export const onRequest = defineMiddleware(async (context, next) => {
  const response = await next();
  const html = (response.headers.get('content-type') ?? '').includes('text/html');
  const cacheable =
    html &&
    response.status === 200 &&
    context.request.method === 'GET' &&
    !context.url.pathname.startsWith('/admin') &&
    !response.headers.has('cache-control');
  const indexable = indexingAllowed(process.env.ALLOW_INDEXING) && response.status !== 404;
  if (indexable && !cacheable) return response;
  // Réponse recopiée : les en-têtes d'une réponse de fetch (relais /admin) sont figés.
  const copy = new Response(response.body, response);
  if (!indexable) copy.headers.set('X-Robots-Tag', NOINDEX_HEADER);
  if (cacheable) copy.headers.set('Cache-Control', PAGE_CACHE);
  return copy;
});
