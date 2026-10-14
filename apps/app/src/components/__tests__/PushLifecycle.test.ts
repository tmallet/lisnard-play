import { notificationTarget } from '../PushLifecycle';

jest.mock('expo-notifications', () => ({}));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('../usePushConfirmation', () => ({ usePushConfirmation: () => undefined }));

const response = (url: unknown) =>
  ({ notification: { request: { content: { data: { url } } } } }) as never;

test('toucher une notification : seule une page d’intervention est ouverte', () => {
  expect(notificationTarget(response('/interventions/1b2c-3d'))).toBe('/interventions/1b2c-3d');
  expect(notificationTarget(response('https://evil.example'))).toBeNull();
  expect(notificationTarget(response('/interventions/../admin'))).toBeNull();
  expect(notificationTarget(null)).toBeNull();
});
