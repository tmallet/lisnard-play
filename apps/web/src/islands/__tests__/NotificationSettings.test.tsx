// @vitest-environment happy-dom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import type { PushRegistration, PushSupport } from '@/lib/push-types';
import { type FakeApi, fakeApi } from '@/test/trpc';

import NotificationSettings from '../NotificationSettings';

const push = vi.hoisted(() => ({
  support: 'supported' as string,
  existing: null as unknown,
  register: 'granted' as 'granted' | 'denied',
  unregistered: 0,
}));
const REGISTRATION: PushRegistration = {
  kind: 'web',
  endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
  keys: { p256dh: 'p', auth: 'a' },
};

vi.mock('@/lib/push', () => ({
  pushClient: {
    support: () => push.support as PushSupport,
    current: async () => push.existing,
    register: async () =>
      push.register === 'denied'
        ? 'denied'
        : {
            kind: 'web',
            endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
            keys: { p256dh: 'p', auth: 'a' },
          },
    unregister: async () => {
      push.unregistered += 1;
    },
    blocked: () => false,
  },
}));

let api: FakeApi;
beforeEach(() => {
  Object.assign(push, {
    support: 'supported',
    existing: null,
    register: 'granted',
    unregistered: 0,
  });
  api = fakeApi({
    'notifications.config': () => ({ vapidPublicKey: 'BKey' }),
    'notifications.subscribe': () => ({ live: true, reminder: true, newItem: false }),
    'notifications.update': (input) => (input as { preferences: unknown }).preferences,
    'notifications.unsubscribe': () => ({ ok: true }),
  });
});

const mutations = () => api.calls.filter((c) => c.procedure !== 'notifications.config');

test('activation : abonnement enregistré, trois préférences affichées', async () => {
  render(<NotificationSettings />);
  fireEvent.click(await screen.findByRole('button', { name: 'Activer les notifications' }));
  await screen.findByText('Les notifications sont activées sur cet appareil.');
  expect(mutations()[0]).toEqual({ procedure: 'notifications.subscribe', input: REGISTRATION });
  expect(
    (screen.getByRole('switch', { name: 'Début d’un direct' }) as HTMLInputElement).checked,
  ).toBe(true);
  expect(
    (screen.getByRole('switch', { name: 'Nouvelles interventions' }) as HTMLInputElement).checked,
  ).toBe(false);
});

test('autorisation refusée : rien n’est enregistré, explication affichée', async () => {
  push.register = 'denied';
  render(<NotificationSettings />);
  fireEvent.click(await screen.findByRole('button', { name: 'Activer les notifications' }));
  await screen.findByText(/sont bloquées/);
  expect(mutations()).toEqual([]);
});

test('iPhone dans Safari : explication de l’ajout à l’écran d’accueil', async () => {
  push.support = 'needs-install';
  render(<NotificationSettings />);
  await screen.findByText(/Sur l’écran d’accueil/);
});

test('abonnement existant : reconfirmé, préférences modifiées, puis désactivation', async () => {
  push.existing = REGISTRATION;
  render(<NotificationSettings />);
  await screen.findByText('Les notifications sont activées sur cet appareil.');
  fireEvent.click(screen.getByRole('switch', { name: 'Rappel avant un direct' }));
  fireEvent.click(screen.getByRole('switch', { name: 'Nouvelles interventions' }));
  // Deux bascules rapides : la seconde requête contient aussi la première.
  await waitFor(() =>
    expect(
      mutations()
        .filter((c) => c.procedure === 'notifications.update')
        .at(-1)?.input,
    ).toEqual({
      endpoint: REGISTRATION.endpoint,
      preferences: { live: true, reminder: false, newItem: true },
    }),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Désactiver les notifications' }));
  await screen.findByRole('button', { name: 'Activer les notifications' });
  expect(mutations().at(-1)).toEqual({
    procedure: 'notifications.unsubscribe',
    input: { endpoint: REGISTRATION.endpoint },
  });
  expect(push.unregistered).toBe(1);
});
