import { shouldInvite } from '../usePushAvailability';

jest.mock('../push', () => ({ pushClient: {} }));
jest.mock('../trpc', () => ({ useTRPC: () => ({}) }));

test('invitation : seulement pour un appareil compatible (ou un iPhone à installer) non abonné', () => {
  expect(shouldInvite({ support: 'supported', subscribed: false })).toBe(true);
  expect(shouldInvite({ support: 'needs-install', subscribed: false })).toBe(true);
  expect(shouldInvite({ support: 'supported', subscribed: true })).toBe(false);
  expect(shouldInvite({ support: 'unsupported', subscribed: false })).toBe(false);
  expect(shouldInvite({ support: 'unconfigured', subscribed: false })).toBe(false);
  expect(shouldInvite({ support: null, subscribed: false })).toBe(false);
});
