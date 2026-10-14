import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react-native';

import type { PushRegistration, PushSupport } from '@/lib/push-types';

import { NotificationSettings } from '../NotificationSettings';

// Préfixe « mock » : variables autorisées dans les fabriques de jest.mock.
const mockPush = {
  support: 'supported' as PushSupport,
  existing: null as PushRegistration | null,
  register: 'granted' as 'granted' | 'denied',
  unregistered: 0,
};
const mockApi = { vapid: 'BKey' as string | null, calls: [] as [string, unknown][] };
const REGISTRATION: PushRegistration = {
  kind: 'web',
  endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
  keys: { p256dh: 'p', auth: 'a' },
};

jest.mock('@/lib/push', () => ({
  pushClient: {
    support: () => mockPush.support,
    current: async () => mockPush.existing,
    register: async () => (mockPush.register === 'denied' ? 'denied' : REGISTRATION),
    unregister: async () => {
      mockPush.unregistered += 1;
    },
    blocked: () => false,
  },
}));

jest.mock('@/lib/trpc', () => {
  const mutation = (name: string, result: (input: { preferences?: unknown }) => unknown) => ({
    mutationOptions: () => ({
      mutationFn: async (input: { preferences?: unknown }) => {
        mockApi.calls.push([name, input]);
        return result(input);
      },
    }),
  });
  return {
    useTRPC: () => ({
      notifications: {
        config: {
          queryOptions: () => ({
            queryKey: ['config'],
            queryFn: async () => ({ vapidPublicKey: mockApi.vapid }),
          }),
        },
        subscribe: mutation('subscribe', () => ({ live: true, reminder: true, newItem: false })),
        update: mutation('update', (input) => input.preferences),
        unsubscribe: mutation('unsubscribe', () => ({ ok: true })),
      },
    }),
  };
});

let client: QueryClient;
beforeEach(() => {
  Object.assign(mockPush, {
    support: 'supported',
    existing: null,
    register: 'granted',
    unregistered: 0,
  });
  Object.assign(mockApi, { vapid: 'BKey', calls: [] });
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});
afterEach(() => client.clear());

const renderSettings = () =>
  render(
    <QueryClientProvider client={client}>
      <NotificationSettings />
    </QueryClientProvider>,
  );

test('activation : abonnement enregistré, trois préférences affichées', async () => {
  await renderSettings();
  await fireEvent.press(await screen.findByText('Activer les notifications'));
  expect(await screen.findByText('Les notifications sont activées sur cet appareil.')).toBeTruthy();
  expect(mockApi.calls[0]).toEqual(['subscribe', REGISTRATION]);
  expect(screen.getByLabelText('Début d’un direct').props.value).toBe(true);
  expect(screen.getByLabelText('Nouvelles interventions').props.value).toBe(false);
});

test('autorisation refusée : rien n’est enregistré, explication affichée', async () => {
  mockPush.register = 'denied';
  await renderSettings();
  await fireEvent.press(await screen.findByText('Activer les notifications'));
  expect(await screen.findByText(/sont bloquées/)).toBeTruthy();
  expect(mockApi.calls).toEqual([]);
});

test('iPhone dans Safari : explication de l’ajout à l’écran d’accueil', async () => {
  mockPush.support = 'needs-install';
  await renderSettings();
  expect(await screen.findByText(/Sur l’écran d’accueil/)).toBeTruthy();
});

test('abonnement existant : reconfirmé, préférence modifiée, puis désactivation', async () => {
  mockPush.existing = REGISTRATION;
  await renderSettings();
  await screen.findByText('Les notifications sont activées sur cet appareil.');
  await fireEvent(screen.getByLabelText('Rappel avant un direct'), 'valueChange', false);
  expect(mockApi.calls.at(-1)).toEqual([
    'update',
    {
      endpoint: REGISTRATION.endpoint,
      preferences: { live: true, reminder: false, newItem: false },
    },
  ]);
  await fireEvent.press(screen.getByText('Désactiver les notifications'));
  expect(await screen.findByText('Activer les notifications')).toBeTruthy();
  expect(mockApi.calls.at(-1)).toEqual(['unsubscribe', { endpoint: REGISTRATION.endpoint }]);
  expect(mockPush.unregistered).toBe(1);
});

test('deux bascules successives : la seconde requête contient aussi la première', async () => {
  mockPush.existing = REGISTRATION;
  await renderSettings();
  await screen.findByText('Les notifications sont activées sur cet appareil.');
  await fireEvent(screen.getByLabelText('Rappel avant un direct'), 'valueChange', false);
  await fireEvent(screen.getByLabelText('Nouvelles interventions'), 'valueChange', true);
  await screen.findByText('Les notifications sont activées sur cet appareil.');
  expect(mockApi.calls.filter(([name]) => name === 'update').at(-1)).toEqual([
    'update',
    {
      endpoint: REGISTRATION.endpoint,
      preferences: { live: true, reminder: false, newItem: true },
    },
  ]);
});
