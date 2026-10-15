import { INDEPENDENCE_NOTICE } from '../../config/app';
import { type CardNode, quoteCard, quoteFontSize, withoutEmoji } from '../quote-card';
import { createQuoteImageHandler, quoteImageParams } from '../quote-image-route';
import { quotePageMeta, quotePageParams } from '../quote-page';

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
      '▶ Le passage à 10:41',
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

test('adresse de l’image : identifiant et minutage seulement', () => {
  const id = 'b710101c-1a11-4810-b8f8-339a5d171995';
  expect(quoteImageParams(`/interventions/${id}/citation/641/image.png`)).toEqual({
    id,
    t: 641,
    format: 'square',
  });
  expect(quoteImageParams(`/interventions/${id}/citation/641/apercu.png`)?.format).toBe(
    'landscape',
  );
  expect(quoteImageParams(`/interventions/${id}/citation/abc/image.png`)).toBeNull();
  expect(quoteImageParams('/interventions/../citation/1/image.png')).toBeNull();
});

describe('route de l’image', () => {
  const params = { id: 'b710101c-1a11-4810-b8f8-339a5d171995', t: 641, format: 'square' as const };
  const req = new Request('http://localhost:3000/x');
  const quote = { ...base, itemId: params.id, startS: 641 };
  const api = (data: unknown, ok = true) =>
    jest.fn(async () => ({ ok, json: async () => ({ result: { data } }) }) as unknown as Response);

  test('une seule image calculée pour des demandes simultanées, puis gardée', async () => {
    const draw = jest.fn(async (_data: unknown) => new Uint8Array([1, 2, 3]));
    const handle = createQuoteImageHandler(api(quote), async () => draw);
    const [a, b] = await Promise.all([
      handle(req, params, 'site.test'),
      handle(req, params, 'site.test'),
    ]);
    await handle(req, params, 'site.test');
    expect([a.status, b.status]).toEqual([200, 200]);
    expect(a.headers.get('content-type')).toBe('image/png');
    expect(draw).toHaveBeenCalledTimes(1);
    expect(draw.mock.calls[0]?.[0]).toMatchObject({ host: 'site.test' });
  });

  test('citation inconnue : 404 ; API indisponible : 503, sans calcul', async () => {
    const draw = jest.fn();
    expect(
      (await createQuoteImageHandler(api(null), async () => draw)(req, params, 'h')).status,
    ).toBe(404);
    expect(
      (await createQuoteImageHandler(api(null, false), async () => draw)(req, params, 'h')).status,
    ).toBe(503);
    expect(draw).not.toHaveBeenCalled();
  });
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

describe('aperçu de la page d’une citation', () => {
  const id = 'b710101c-1a11-4810-b8f8-339a5d171995';
  const quote = { ...base, itemId: id, startS: 641 };

  test('adresse de page seulement, pas celle de l’image', () => {
    expect(quotePageParams(`/interventions/${id}/citation/643`)).toEqual({ id, t: 643 });
    expect(quotePageParams(`/interventions/${id}/citation/643/image.png`)).toBeNull();
  });

  test('titre, description et balises d’aperçu, adresses absolues et échappées', () => {
    const meta = quotePageMeta({ ...quote, text: 'Il dit "non" & <oui>' }, 'https://play.test');
    expect(meta.title).toBe('« Il dit "non" & <oui> » · Lisnard Play');
    expect(meta.description).toBe('David Lisnard sur BFMTV, 13 octobre 2026');
    expect(quotePageMeta({ ...quote, official: true }, 'https://play.test').description).toBe(
      'David Lisnard sur sa chaîne YouTube, 13 octobre 2026',
    );
    expect(meta.tags).toContain('<meta name="twitter:card" content="summary_large_image"/>');
    expect(meta.tags).toContain(
      `<meta property="og:image" content="https://play.test/interventions/${id}/citation/641/apercu.png"/>`,
    );
    expect(meta.tags).toContain('Il dit &#34;non&#34; &#38; &#60;oui&#62;');
    expect(meta.tags).not.toContain('<oui>');
  });
});
