import type { APIRoute } from 'astro';

import { indexingAllowedFor, publicOrigin, requestHost, robotsTxt } from '@/server/indexing';
import { siteUrl } from '@/server/site';

export const GET: APIRoute = ({ request }) =>
  new Response(
    robotsTxt(
      indexingAllowedFor(process.env.ALLOW_INDEXING, requestHost(request.headers), siteUrl().host),
      publicOrigin(request),
    ),
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  );
