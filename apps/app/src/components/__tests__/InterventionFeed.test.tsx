import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react-native';

import type { InterventionCardData } from '../InterventionCard';
import { InterventionFeed } from '../InterventionFeed';

jest.mock('expo-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

type Lists = Record<'live' | 'upcoming' | 'past', InterventionCardData[]>;
const lists: Lists = { live: [], upcoming: [], past: [] };

type Input = { status: keyof Lists; theme?: string };
const select = (input: Input) =>
  lists[input.status].filter((i) => !input.theme || (i.themes as string[]).includes(input.theme));

// Client tRPC simulé : renvoie les listes ci-dessus selon le statut et le thème demandés.
jest.mock('@/lib/trpc', () => ({
  useTRPC: () => ({
    interventions: {
      list: {
        queryOptions: (input: Input) => ({
          queryKey: ['list', input],
          queryFn: async () => ({ items: select(input), nextCursor: null }),
        }),
        infiniteQueryOptions: (input: Input, opts: { getNextPageParam: () => null }) => ({
          queryKey: ['infinite', input],
          queryFn: async () => ({ items: select(input), nextCursor: null }),
          initialPageParam: null,
          getNextPageParam: opts.getNextPageParam,
        }),
      },
    },
  }),
}));

const item = (
  id: string,
  status: InterventionCardData['status'],
  themes: InterventionCardData['themes'] = [],
): InterventionCardData => ({
  id,
  title: `Intervention ${id}`,
  outlet: 'BFMTV',
  kind: 'tv',
  themes,
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

test('filtre par thème : seules les interventions du thème, filtre signalé actif', async () => {
  lists.past = [item('eco', 'past', ['economie']), item('secu', 'past', ['securite'])];
  await renderFeed();
  expect(await screen.findByText('Intervention eco')).toBeTruthy();
  await fireEvent.press(screen.getByRole('radio', { name: 'Sécurité' }));
  expect(await screen.findByText('Intervention secu')).toBeTruthy();
  expect(screen.queryByText('Intervention eco')).toBeNull();
  expect(screen.getByRole('radio', { name: 'Sécurité' }).props.accessibilityState).toEqual({
    selected: true,
  });
});

test('thème sans intervention : message dédié', async () => {
  lists.past = [item('eco', 'past', ['economie'])];
  await renderFeed();
  await screen.findByText('Intervention eco');
  await fireEvent.press(screen.getByRole('radio', { name: 'Immigration' }));
  expect(
    await screen.findByText('Aucune intervention ne correspond à ce thème pour l’instant.'),
  ).toBeTruthy();
});
