import { QueryClient } from '@tanstack/react-query';

import { refreshActiveQueries } from '../refresh';

test('actualisation : une liste paginée repart de sa première page', async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { gcTime: Number.POSITIVE_INFINITY } },
  });
  const key = ['past'];
  client.setQueryData(key, { pages: ['p1', 'p2', 'p3'], pageParams: [null, 'c1', 'c2'] });
  const refetch = jest.spyOn(client, 'refetchQueries').mockResolvedValue();
  // Sans composant abonné, la requête n'est pas « active » : on la fournit directement.
  jest
    .spyOn(client.getQueryCache(), 'findAll')
    .mockReturnValue(client.getQueryCache().findAll({ queryKey: key }));
  await refreshActiveQueries(client);
  expect(client.getQueryData(key)).toEqual({ pages: ['p1'], pageParams: [null] });
  expect(refetch).toHaveBeenCalledWith({ type: 'active' });
  client.clear();
});
