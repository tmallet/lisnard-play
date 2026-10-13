import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react-native';

import type { InterventionCardData } from '../InterventionCard';
import { InterventionFeed } from '../InterventionFeed';

jest.mock('expo-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

type Lists = Record<'live' | 'upcoming' | 'past', InterventionCardData[]>;
const lists: Lists = { live: [], upcoming: [], past: [] };

// Client tRPC simulé : renvoie les listes ci-dessus selon le statut demandé.
jest.mock('@/lib/trpc', () => ({
  useTRPC: () => ({
    interventions: {
      list: {
        queryOptions: (input: { status: keyof Lists }) => ({
          queryKey: ['list', input],
          queryFn: async () => ({ items: lists[input.status], nextCursor: null }),
        }),
        infiniteQueryOptions: (
          input: { status: keyof Lists },
          opts: { getNextPageParam: () => null },
        ) => ({
          queryKey: ['infinite', input],
          queryFn: async () => ({ items: lists[input.status], nextCursor: null }),
          initialPageParam: null,
          getNextPageParam: opts.getNextPageParam,
        }),
      },
    },
  }),
}));

const item = (id: string, status: InterventionCardData['status']): InterventionCardData => ({
  id,
  title: `Intervention ${id}`,
  outlet: 'BFMTV',
  kind: 'tv',
  role: 'national',
  status,
  date: '2026-10-13T08:00:00.000Z',
  thumbnailUrl: null,
});

let client: QueryClient;

async function renderFeed() {
  // gcTime infini : aucun minuteur de nettoyage ne survit aux tests.
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Number.POSITIVE_INFINITY } },
  });
  await render(
    <QueryClientProvider client={client}>
      <InterventionFeed />
    </QueryClientProvider>,
  );
}

afterEach(() => client?.clear());

beforeEach(() => {
  lists.live = [];
  lists.upcoming = [];
  lists.past = [];
});

test('aucune intervention : message, sans sections vides', async () => {
  await renderFeed();
  expect(
    await screen.findByText('Les interventions de David Lisnard apparaîtront ici.'),
  ).toBeTruthy();
  expect(screen.queryByText('En direct')).toBeNull();
  expect(screen.queryByText('À venir')).toBeNull();
});

test('un direct en cours : section « En direct » affichée en premier', async () => {
  lists.live = [item('a', 'live')];
  lists.past = [item('b', 'past')];
  await renderFeed();
  expect(await screen.findByText('Intervention a')).toBeTruthy();
  const headings = screen.getAllByRole('heading').map((h) => h.props.children);
  expect(headings).toEqual(['En direct', 'Passées']);
});
