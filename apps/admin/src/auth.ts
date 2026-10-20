/**
 * Authentification du backoffice (spec admin-backoffice, ADR 0032) : Better Auth, un
 * seul compte sans inscription, mot de passe puis TOTP obligatoire, codes de secours.
 * Cookie limité à /admin, HttpOnly, Secure, SameSite=Strict ; tentatives limitées.
 */
import type { Db } from '@lisnard/db/client';
import {
  authAccount,
  authSession,
  authTwoFactor,
  authUser,
  authVerification,
} from '@lisnard/db/schema';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { twoFactor } from 'better-auth/plugins';

export const BASE_PATH = '/admin/api/auth';

export function createAuth(options: { db: Db; secret: string; baseURL: string; secure?: boolean }) {
  const secure = options.secure ?? true;
  return betterAuth({
    appName: 'Lisnard Play',
    secret: options.secret,
    baseURL: options.baseURL,
    basePath: BASE_PATH,
    trustedOrigins: [new URL(options.baseURL).origin],
    database: drizzleAdapter(options.db, {
      provider: 'pg',
      schema: {
        user: authUser,
        session: authSession,
        account: authAccount,
        verification: authVerification,
        twoFactor: authTwoFactor,
      },
    }),
    emailAndPassword: { enabled: true, disableSignUp: true, minPasswordLength: 12 },
    // Session courte : 8 h, prolongée à l'usage au plus une fois par heure.
    session: { expiresIn: 8 * 3600, updateAge: 3600 },
    rateLimit: {
      enabled: true,
      window: 60,
      max: 30,
      customRules: {
        '/sign-in/email': { window: 300, max: 5 },
        '/two-factor/verify-totp': { window: 300, max: 5 },
        '/two-factor/verify-backup-code': { window: 300, max: 5 },
      },
    },
    advanced: {
      useSecureCookies: secure,
      cookiePrefix: 'lisnard-admin',
      defaultCookieAttributes: { path: '/admin', httpOnly: true, sameSite: 'strict', secure },
    },
    plugins: [twoFactor({ issuer: 'Lisnard Play (admin)' })],
  });
}

export type Auth = ReturnType<typeof createAuth>;
