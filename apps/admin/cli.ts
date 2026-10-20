/**
 * Commandes d'exploitation du backoffice (ADR 0032), dans le terminal du service admin :
 *   bun cli.ts create-account --email <adresse>   crée le compte unique (mot de passe demandé)
 *   bun cli.ts reset-2fa                           dissocie le TOTP (téléphone perdu)
 */
import { parseArgs } from 'node:util';

import { createDb } from '@lisnard/db/client';
import { authTwoFactor, authUser } from '@lisnard/db/schema';
import { createAccount } from './src/account';
import { createAuth } from './src/auth';

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: { email: { type: 'string' } },
});
const url = process.env.ADMIN_DATABASE_URL;
if (!url) throw new Error('variable manquante : ADMIN_DATABASE_URL');
const db = createDb(url);

switch (positionals[0]) {
  case 'create-account': {
    if (!values.email) throw new Error('--email requis');
    // Saisie au terminal ; jamais en argument (historique du shell).
    const password = prompt('Mot de passe (12 caractères au moins) :') ?? '';
    const auth = createAuth({
      db,
      secret: process.env.BETTER_AUTH_SECRET ?? 'cli',
      baseURL: process.env.SITE_URL ?? 'https://play.projetlisnard.fr',
    });
    await createAccount(auth, db, values.email, password);
    console.log('Compte créé. Connectez-vous à /admin pour associer le TOTP.');
    break;
  }
  case 'reset-2fa': {
    await db.delete(authTwoFactor);
    await db.update(authUser).set({ twoFactorEnabled: false });
    console.log('TOTP dissocié : la prochaine connexion demandera une nouvelle association.');
    break;
  }
  default:
    console.log('Commandes : create-account --email <adresse>, reset-2fa');
}
process.exit(0);
