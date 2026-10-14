import type { QueryClient } from '@tanstack/react-query';

/**
 * Actualisation (tirer pour actualiser) : les listes paginées repartent de leur première
 * page au lieu de recharger, l'une après l'autre, toutes les pages déjà parcourues.
 */
export async function refreshActiveQueries(client: QueryClient): Promise<void> {
  for (const query of client.getQueryCache().findAll({ type: 'active' })) {
    const data = query.state.data as { pages?: unknown[]; pageParams?: unknown[] } | undefined;
    if (data?.pages && data.pages.length > 1)
      client.setQueryData(query.queryKey, {
        pages: data.pages.slice(0, 1),
        pageParams: data.pageParams?.slice(0, 1) ?? [],
      });
  }
  await client.refetchQueries({ type: 'active' });
}
