import { isAdminPath, relayToAdmin } from '../admin-relay';

test('chemins du backoffice', () => {
  expect(isAdminPath('/admin')).toBe(true);
  expect(isAdminPath('/admin/api/auth/sign-in/email')).toBe(true);
  expect(isAdminPath('/administration')).toBe(false);
  expect(isAdminPath('/campagne')).toBe(false);
});

test('sans service configuré : 503 ; sinon méthode, cookies et corps transmis', async () => {
  expect((await relayToAdmin(new Request('https://play.test/admin'), undefined)).status).toBe(503);
  const seen: Request[] = [];
  global.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    seen.push(new Request(input, init));
    return new Response('ok', { headers: { 'X-Admin': 'oui' } });
  }) as unknown as typeof fetch;
  const res = await relayToAdmin(
    new Request('https://play.test/admin/api/auth/sign-in/email?x=1', {
      method: 'POST',
      headers: { Cookie: 's=1', Origin: 'https://play.test' },
      body: '{"email":"a"}',
    }),
    'http://admin:3001',
  );
  // Réponse rendue telle quelle (les cookies, filtrés par l'environnement de test, sont vérifiés par le smoke).
  expect(res.headers.get('x-admin')).toBe('oui');
  expect(seen[0]?.url).toBe('http://admin:3001/admin/api/auth/sign-in/email?x=1');
  expect(seen[0]?.method).toBe('POST');
  expect(seen[0]?.headers.get('cookie')).toBe('s=1');
  expect(await seen[0]?.text()).toBe('{"email":"a"}');
});
