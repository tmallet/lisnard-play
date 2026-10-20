import { createTRPCClient, httpLink, TRPCClientError } from '@trpc/client';
import { twoFactorClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';

import type { AdminRouter } from '../../../src/router';

/** API du backoffice (tRPC), même origine : le cookie de session limité à /admin suit. */
export const api = createTRPCClient<AdminRouter>({
  links: [httpLink({ url: '/admin/api/trpc' })],
});

/** Client Better Auth : mot de passe, puis TOTP. */
export const authClient = createAuthClient({
  baseURL: window.location.origin,
  basePath: '/admin/api/auth',
  plugins: [twoFactorClient()],
});

/** Code HTTP d'une erreur tRPC (401 non connecté, 403 TOTP manquant). */
export const httpStatus = (error: unknown) =>
  error instanceof TRPCClientError
    ? (error.data as { httpStatus?: number } | undefined)?.httpStatus
    : undefined;
