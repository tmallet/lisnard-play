import { shouldInvite } from '../usePushAvailability';

jest.mock('../push', () => ({ pushClient: {} }));
jest.mock('../trpc', () => ({ useTRPC: () => ({}) }));

test('invitation : seulement pour un appareil compatible (ou un iPhone à installer) non abonné', () => {
  const base = { subscribed: false, blocked: false };
  expect(shouldInvite({ ...base, support: 'supported' })).toBe(true);
  expect(shouldInvite({ ...base, support: 'needs-install' })).toBe(true);
  expect(shouldInvite({ ...base, support: 'supported', subscribed: true })).toBe(false);
  expect(shouldInvite({ ...base, support: 'supported', blocked: true })).toBe(false);
  expect(shouldInvite({ ...base, support: 'unsupported' })).toBe(false);
  expect(shouldInvite({ ...base, support: 'unconfigured' })).toBe(false);
  expect(shouldInvite({ ...base, support: null })).toBe(false);
});
