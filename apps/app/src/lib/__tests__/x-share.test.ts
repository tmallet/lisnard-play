import { xShareText, xShareUrl } from '../x-share';

test('message : citation entre guillemets, signée', () => {
  expect(xShareText("L'État profond, c'est Bercy.")).toBe(
    "« L'État profond, c'est Bercy. » — David Lisnard",
  );
});

test('citation longue : raccourcie au mot, le tout tient dans 280 avec le lien', () => {
  const text = xShareText(`${'mot '.repeat(120)}fin.`);
  expect(text.length + 1 + 23).toBeLessThanOrEqual(280);
  expect(text).toMatch(/mot… » — David Lisnard$/);
});

test('adresse de partage X : texte et lien encodés', () => {
  const url = new URL(xShareUrl('Oui & non', 'https://play.test/interventions/a/citation/1'));
  expect(url.origin + url.pathname).toBe('https://x.com/intent/post');
  expect(url.searchParams.get('text')).toBe('« Oui & non » — David Lisnard');
  expect(url.searchParams.get('url')).toBe('https://play.test/interventions/a/citation/1');
});
