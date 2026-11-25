import { INDEPENDENCE_NOTICE } from '../../config/app';
import { cachedImage } from '../images';
import { type CardNode, quoteCard, quoteFontSize, withoutEmoji } from '../quote-card';

/** Tous les textes de l'arbre, dans l'ordre. */
const texts = (node: CardNode | string): string[] => {
  if (typeof node === 'string') return [node];
  const children = node.props.children;
  if (children === undefined) return [];
  return (Array.isArray(children) ? children : [children]).flatMap(texts);
};

const base = {
  text: "L'État profond en France, c'est Bercy.",
  outlet: 'BFMTV',
  official: false,
  day: '2026-10-13',
  startS: 641,
  durationS: 1206,
  theme: 'economy',
  host: 'play.projetlisnard.fr',
};

test('image : citation, signature, média et date, thème, passage, site et mention', () => {
  const all = texts(quoteCard(base));
  expect(all).toEqual(
    expect.arrayContaining([
      base.text,
      'DAVID LISNARD',
      '13 OCTOBRE 2026 · BFMTV',
      'ÉCONOMIE',
      'Le passage à 10:41',
      '20:06',
      'play.projetlisnard.fr',
      INDEPENDENCE_NOTICE,
    ]),
  );
});

test('image : sa chaîne sans son nom en tête ; ni thème inconnu ni barre sans durée', () => {
  const all = texts(quoteCard({ ...base, official: true, theme: 'autre', durationS: null }));
  expect(all).toContain('13 OCTOBRE 2026');
  expect(all.join(' ')).not.toMatch(/BFMTV|AUTRE|20:06/);
  expect(JSON.stringify(quoteCard({ ...base, durationS: null }))).not.toContain('%');
});

test('taille du texte : grande pour une phrase courte, réduite pour une longue', () => {
  expect(quoteFontSize('Court.')).toBe(66);
  expect(quoteFontSize('x'.repeat(220))).toBe(40);
});

describe('cache des images', () => {
  test('une seule image calculée pour des demandes simultanées, puis gardée', async () => {
    const draw = vi.fn(async () => new Uint8Array([1, 2, 3]));
    const key = `test-${Math.random()}`;
    const [a, b] = await Promise.all([cachedImage(key, draw), cachedImage(key, draw)]);
    await cachedImage(key, draw);
    expect(a).toEqual(b);
    expect(draw).toHaveBeenCalledTimes(1);
  });

  test('échec : rien n’est gardé, la demande suivante recalcule', async () => {
    const key = `test-${Math.random()}`;
    await expect(cachedImage(key, async () => Promise.reject(new Error('x')))).rejects.toThrow();
    const draw = vi.fn(async () => new Uint8Array([4]));
    expect(await cachedImage(key, draw)).toEqual(new Uint8Array([4]));
  });
});

test('triangle de lecture dessiné en image, pas en caractère absent des polices', () => {
  expect(JSON.stringify(quoteCard(base))).toContain('data:image/svg+xml;base64,');
  expect(texts(quoteCard(base)).join(' ')).not.toContain('▶');
});

test('emojis retirés du texte (absents de Montserrat)', () => {
  expect(withoutEmoji('Bravo 👏🏻 à tous 🇫🇷 !')).toBe('Bravo à tous !');
  expect(withoutEmoji('Le prix : 10 € — « net ».')).toBe('Le prix : 10 € — « net ».');
});

test('paysage : 1200 × 630, même contenu, texte plus petit', () => {
  const square = quoteCard(base);
  const landscape = quoteCard(base, 'landscape');
  expect(landscape.props.style).toMatchObject({ width: 1200, height: 630 });
  expect(texts(landscape)).toEqual(texts(square));
  const size = (node: CardNode) =>
    JSON.stringify(node).match(/"fontSize":(\d+),"fontWeight":700,"lineHeight"/)?.[1];
  expect(Number(size(landscape))).toBeLessThan(Number(size(square)));
});
