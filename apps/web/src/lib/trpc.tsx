import type { AppRouter } from '@lisnard/api';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import { createTRPCContext } from '@trpc/tanstack-react-query';
import type { ReactNode } from 'react';

export const { TRPCProvider, useTRPC } = createTRPCContext<AppRouter>();

/**
 * Client partagé par tous les îlots d'une page : chaque îlot est une racine React à part,
 * mais le module n'est chargé qu'une fois dans le navigateur. Côté serveur (rendu initial
 * des îlots), un client neuf par rendu, pour ne rien partager entre deux visiteurs.
 */
let browser: { query: QueryClient; trpc: ReturnType<typeof createClient> } | null = null;

const createClient = () =>
  createTRPCClient<AppRouter>({ links: [httpBatchLink({ url: '/api/trpc' })] });

/**
 * Une seule nouvelle tentative après un échec : au-delà, l'îlot affiche l'échec et le
 * visiteur réessaie lui-même (bouton « Réessayer »).
 */
const createQueryClient = () => new QueryClient({ defaultOptions: { queries: { retry: 1 } } });

function clients() {
  if (typeof window === 'undefined') return { query: createQueryClient(), trpc: createClient() };
  browser ??= { query: createQueryClient(), trpc: createClient() };
  return browser;
}

/** Tests : repart d'un client vide (cache et requêtes en cours oubliés). */
export function resetApiClients(): void {
  // Requêtes annulées d'abord : une nouvelle tentative programmée partirait sinon plus tard.
  void browser?.query.cancelQueries();
  browser?.query.clear();
  browser = null;
}

export function ApiProvider({ children }: { children: ReactNode }) {
  const { query, trpc } = clients();
  return (
    <QueryClientProvider client={query}>
      <TRPCProvider trpcClient={trpc} queryClient={query}>
        {children}
      </TRPCProvider>
    </QueryClientProvider>
  );
}
