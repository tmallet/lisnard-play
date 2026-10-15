import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import type { InterventionCardData } from '../InterventionCard';
import { InterventionFeed } from '../InterventionFeed';
import { ScrollEndProvider } from '../ScrollEnd';

// L'invitation aux notifications a ses propres tests (usePushAvailability).
jest.mock('../NotifyInvite', () => ({ NotifyInvite: () => null }));
// L'invitation à adhérer est testée à part (JoinCta.test.tsx).
jest.mock('../JoinCta', () => {
  const { Text } = require('react-native');
  return { JoinCta: () => <Text>Encart adhésion</Text> };
});
jest.mock('../JoinBar', () => {
  const { Text } = require('react-native');
  return { JoinBar: () => <Text>Bandeau adhésion</Text> };
});
jest.mock('expo-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

type Lists = Record<'live' | 'upcoming' | 'past', InterventionCardData[]>;
const lists: Lists = { live: [], upcoming: [], past: [] };

type Input = { status: keyof Lists; theme?: string };
// Préfixe « mock » : jest autorise cette variable dans la fabrique de jest.mock.
const mockPaging = { size: Number.POSITIVE_INFINITY, failNextPage: false };
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
        infiniteQueryOptions: (
          input: Input,
          opts: { getNextPageParam: (last: { nextCursor: string | null }) => unknown },
        ) => ({
          queryKey: ['infinite', input],
          // Pagination simulée : pages de pageSize éléments, curseur = position de départ.
          queryFn: async ({ pageParam }: { pageParam: string | null }) => {
            const start = Number(pageParam ?? 0);
            if (pageParam && mockPaging.failNextPage) throw new Error('réseau');
            const all = select(input);
            const end = start + mockPaging.size;
            return {
              items: all.slice(start, end),
              nextCursor: end < all.length ? String(end) : null,
            };
          },
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
/** Abonnés à la fin de défilement, comme les fournit Screen. */
const endListeners = new Set<() => void>();

async function renderFeed() {
  // gcTime infini : aucun minuteur de nettoyage ne survit aux tests.
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Number.POSITIVE_INFINITY } },
  });
  await render(
    <QueryClientProvider client={client}>
      <ScrollEndProvider value={endListeners}>
        <InterventionFeed />
      </ScrollEndProvider>
    </QueryClientProvider>,
  );
}

afterEach(() => client?.clear());

beforeEach(() => {
  lists.live = [];
  lists.upcoming = [];
  lists.past = [];
  mockPaging.size = Number.POSITIVE_INFINITY;
  mockPaging.failNextPage = false;
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
  lists.past = [item('eco', 'past', ['economy']), item('secu', 'past', ['security'])];
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
  lists.past = [item('eco', 'past', ['economy'])];
  await renderFeed();
  await screen.findByText('Intervention eco');
  await fireEvent.press(screen.getByRole('radio', { name: 'Immigration' }));
  expect(
    await screen.findByText('Aucune intervention ne correspond à ce thème pour l’instant.'),
  ).toBeTruthy();
});

test('chargement continu : la page suivante arrive en fin de défilement', async () => {
  mockPaging.size = 2;
  lists.past = [item('p1', 'past'), item('p2', 'past'), item('p3', 'past')];
  await renderFeed();
  expect(await screen.findByText('Intervention p2')).toBeTruthy();
  expect(screen.queryByText('Intervention p3')).toBeNull();
  expect(screen.queryByText('Voir plus')).toBeNull();
  await act(async () => {
    for (const listener of endListeners) listener();
  });
  expect(await screen.findByText('Intervention p3')).toBeTruthy();
});

test('invitation à adhérer : bandeau sur téléphone, puis après la première rangée (2 ou 3 cartes)', async () => {
  lists.past = Array.from({ length: 5 }, (_, i) => item(`p${i + 1}`, 'past'));
  await renderFeed();
  await screen.findByText('Intervention p5');
  const text = JSON.stringify(screen.toJSON());
  const positions = [...text.matchAll(/Encart adhésion|Intervention p\d/g)].map((m) => m[0]);
  // Une variante par largeur ; chacune n'est visible qu'à la sienne (classes md: et lg:).
  expect(positions).toEqual([
    'Intervention p1',
    'Intervention p2',
    'Encart adhésion',
    'Intervention p3',
    'Encart adhésion',
    'Intervention p4',
    'Intervention p5',
  ]);
  // Téléphone : bandeau au-dessus des cartes.
  expect(text.indexOf('Bandeau adhésion')).toBeLessThan(text.indexOf('Intervention p1'));
});

test('invitation à adhérer : une variante par largeur même avec une seule passée', async () => {
  lists.past = [item('p1', 'past')];
  await renderFeed();
  await screen.findByText('Intervention p1');
  expect(screen.getAllByText('Encart adhésion')).toHaveLength(2);
  expect(screen.getByText('Bandeau adhésion')).toBeTruthy();
});

test('page suivante en échec : la liste reste affichée, on peut réessayer', async () => {
  mockPaging.size = 2;
  mockPaging.failNextPage = true;
  lists.past = [item('p1', 'past'), item('p2', 'past'), item('p3', 'past')];
  await renderFeed();
  await screen.findByText('Intervention p2');
  await act(async () => {
    for (const listener of endListeners) listener();
  });
  const retry = await screen.findByText('Chargement impossible. Réessayer');
  expect(screen.getByText('Intervention p1')).toBeTruthy();
  expect(
    screen.queryByText('Les interventions n’ont pas pu être chargées. Réessayez dans un instant.'),
  ).toBeNull();
  mockPaging.failNextPage = false;
  await fireEvent.press(retry);
  expect(await screen.findByText('Intervention p3')).toBeTruthy();
});
