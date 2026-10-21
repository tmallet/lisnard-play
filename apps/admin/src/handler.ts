/**
 * Requêtes du service admin, toutes sous /admin (spec admin-backoffice, ADR 0032) :
 * authentification, API, interface. Tout porte `X-Robots-Tag: noindex`.
 */
import { join, normalize } from 'node:path';

import type { Db } from '@lisnard/db/client';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';

import { type Auth, BASE_PATH } from './auth';
import { adminRouter } from './router';

const NOINDEX = 'noindex, nofollow';

function withHeaders(response: Response): Response {
  const copy = new Response(response.body, response);
  copy.headers.set('X-Robots-Tag', NOINDEX);
  copy.headers.set('X-Frame-Options', 'DENY');
  copy.headers.set('Referrer-Policy', 'same-origin');
  return copy;
}

/** Fichier de l'interface ; toute adresse inconnue sert index.html (application à une page). */
async function uiFile(clientDir: string, pathname: string): Promise<Response> {
  const relative = pathname.replace(/^\/admin\/?/, '') || 'index.html';
  let decoded: string;
  try {
    decoded = decodeURIComponent(relative);
  } catch {
    decoded = 'index.html';
  }
  const path = normalize(join(clientDir, decoded));
  const file = path.startsWith(`${clientDir}/`) ? Bun.file(path) : null;
  if (file && (await file.exists())) return new Response(file);
  return new Response(Bun.file(join(clientDir, 'index.html')), {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

export function createAdminHandler(options: { db: Db; auth: Auth; clientDir: string }) {
  const { db, auth, clientDir } = options;
  return async (req: Request): Promise<Response> => {
    const { pathname } = new URL(req.url);
    if (pathname === '/admin/health') return withHeaders(Response.json({ status: 'ok' }));
    if (pathname.startsWith(`${BASE_PATH}/`)) return withHeaders(await auth.handler(req));
    if (pathname.startsWith('/admin/api/trpc/')) {
      const session = await auth.api.getSession({ headers: req.headers });
      const user = session
        ? { email: session.user.email, twoFactorEnabled: Boolean(session.user.twoFactorEnabled) }
        : null;
      return withHeaders(
        await fetchRequestHandler({
          endpoint: '/admin/api/trpc',
          req,
          router: adminRouter,
          createContext: () => ({ db, user }),
        }),
      );
    }
    if (pathname === '/admin' || pathname.startsWith('/admin/'))
      return withHeaders(await uiFile(clientDir, pathname));
    return withHeaders(new Response('Introuvable', { status: 404 }));
  };
}
