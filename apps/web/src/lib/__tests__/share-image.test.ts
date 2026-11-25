// @vitest-environment happy-dom
import { shareImage } from '../share-image';

const png = new Blob(['png'], { type: 'image/png' });

beforeEach(() => {
  global.fetch = vi
    .fn()
    .mockResolvedValue({ ok: true, blob: () => Promise.resolve(png) }) as unknown as typeof fetch;
  URL.createObjectURL = vi.fn(() => 'blob:x');
  URL.revokeObjectURL = vi.fn();
});

test('navigateur qui partage des fichiers : feuille de partage avec l’image', async () => {
  const share = vi.fn().mockResolvedValue(undefined);
  Object.assign(navigator, { canShare: () => true, share });
  expect(await shareImage('/i.png', 'c.png')).toBe('shared');
  expect(share.mock.calls[0]?.[0].files[0]?.name).toBe('c.png');
});

test('sinon, téléchargement de l’image', async () => {
  Object.assign(navigator, { canShare: () => false, share: undefined });
  // Environnement de test sans DOM : lien de téléchargement simulé.
  const link = { href: '', download: '', click: vi.fn() };
  Object.assign(global, { document: { createElement: () => link } });
  expect(await shareImage('/i.png', 'c.png')).toBe('downloaded');
  expect(link).toMatchObject({ href: 'blob:x', download: 'c.png' });
  expect(link.click).toHaveBeenCalled();
});

test('image indisponible (serveur de développement, citation disparue)', async () => {
  global.fetch = vi.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch;
  expect(await shareImage('/i.png', 'c.png')).toBe('failed');
});
