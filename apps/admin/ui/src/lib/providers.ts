import type { AuthProvider, DataProvider } from '@refinedev/core';

import { api, authClient, httpStatus } from './api';

const unsupported = () => Promise.reject(new Error('Opération non prise en charge'));

/**
 * Fournisseur de données Refine sur l'API tRPC du backoffice : ressources « videos »
 * (filtre et recherche en filtres Refine) et « actions » (historique).
 */
export const dataProvider: DataProvider = {
  getApiUrl: () => '/admin/api/trpc',
  getList: async ({ resource, pagination, filters }) => {
    const page = pagination?.currentPage ?? 1;
    const pageSize = pagination?.pageSize ?? 25;
    // Filtres des colonnes du tableau Refine : « title » (recherche), « state » (état).
    const value = (field: string) =>
      filters?.find((f) => 'field' in f && f.field === field)?.value as string | undefined;
    if (resource === 'actions') {
      const { actions, total } = await api.actions.list.query({ page, pageSize });
      return { data: actions as never[], total };
    }
    const filter = (value('state') ?? 'all') as 'all';
    const { items, total } = await api.items.list.query({
      page,
      pageSize,
      filter,
      search: value('title') || undefined,
    });
    return { data: items as never[], total };
  },
  getOne: async ({ id }) => ({ data: (await api.items.get.query({ id: String(id) })) as never }),
  create: unsupported,
  update: unsupported,
  deleteOne: unsupported,
};

/**
 * Authentification Refine sur Better Auth : mot de passe, puis TOTP. Sans TOTP associé,
 * la session ne donne accès qu'à la page d'association.
 */
export const authProvider: AuthProvider = {
  login: async ({ email, password }: { email: string; password: string }) => {
    const { data, error } = await authClient.signIn.email({ email, password });
    if (error)
      return {
        success: false,
        error: { name: 'Connexion refusée', message: 'Adresse ou mot de passe incorrect.' },
      };
    if (data && 'twoFactorRedirect' in data && data.twoFactorRedirect)
      return { success: true, redirectTo: '/code' };
    const me = await api.me.query();
    return { success: true, redirectTo: me?.twoFactorEnabled ? '/videos' : '/association' };
  },
  logout: async () => {
    await authClient.signOut();
    return { success: true, redirectTo: '/connexion' };
  },
  check: async () => {
    const me = await api.me.query().catch(() => null);
    if (!me) return { authenticated: false, redirectTo: '/connexion' };
    if (!me.twoFactorEnabled) return { authenticated: false, redirectTo: '/association' };
    return { authenticated: true };
  },
  onError: async (error) => {
    const status = httpStatus(error);
    if (status === 401) return { logout: true, redirectTo: '/connexion' };
    if (status === 403) return { redirectTo: '/association' };
    return {};
  },
  // Identité affichée par l'en-tête Refine (avatar, nom, adresse).
  getIdentity: async () => {
    const me = await api.me.query();
    return me ? { id: me.email, fullName: 'Administrateur', email: me.email } : null;
  },
};
