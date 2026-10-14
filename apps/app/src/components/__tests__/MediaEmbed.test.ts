import { allowsInWebView } from '../MediaEmbed';

// Module natif absent sous Jest : seule la règle de navigation est testée ici.
jest.mock('react-native-webview', () => ({ WebView: () => null }));

const EMBED = 'https://www.youtube.com/embed/abc';

test('vue du lecteur : page enveloppe et chargement du cadre autorisés', () => {
  expect(allowsInWebView({ url: 'about:blank' }, EMBED)).toBe(true);
  expect(allowsInWebView({ url: EMBED }, EMBED)).toBe(true);
  expect(allowsInWebView({ url: EMBED, isTopFrame: false }, EMBED)).toBe(true);
});

test('lien suivi depuis le lecteur : ouvert hors de la vue', () => {
  // Même hôte que le lecteur, mais navigation principale : la page youtube.com
  // ne doit pas s'afficher dans le cadre 16:9.
  expect(
    allowsInWebView({ url: 'https://www.youtube.com/watch?v=abc', isTopFrame: true }, EMBED),
  ).toBe(false);
  expect(allowsInWebView({ url: 'https://www.youtube.com/watch?v=abc' }, EMBED)).toBe(false);
});
