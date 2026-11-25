import type { APIRoute } from 'astro';

import { indexingAllowed, publicOrigin, robotsTxt } from '@/server/indexing';

export const GET: APIRoute = ({ request }) =>
  new Response(robotsTxt(indexingAllowed(process.env.ALLOW_INDEXING), publicOrigin(request)), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
