import type { Db } from '@lisnard/db/client';
import { authUser } from '@lisnard/db/schema';
import { count } from 'drizzle-orm';

import type { Auth } from './auth';

/**
 * Crée le compte unique du backoffice, par l'adaptateur interne de Better Auth
 * (l'inscription publique est désactivée). Refuse s'il existe déjà un compte.
 */
export async function createAccount(auth: Auth, db: Db, email: string, password: string) {
  const [existing] = await db.select({ n: count() }).from(authUser);
  if ((existing?.n ?? 0) > 0) throw new Error('un compte existe déjà : un seul compte est permis');
  if (password.length < 12) throw new Error('mot de passe trop court (12 caractères au moins)');
  const ctx = await auth.$context;
  const user = await ctx.internalAdapter.createUser(
    { email, name: 'Administrateur' },
    { method: 'admin' },
  );
  await ctx.internalAdapter.linkAccount({
    userId: user.id,
    providerId: 'credential',
    accountId: user.id,
    password: await ctx.password.hash(password),
  });
  return user;
}
