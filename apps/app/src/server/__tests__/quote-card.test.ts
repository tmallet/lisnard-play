import { INDEPENDENCE_NOTICE } from '../../config/app';
import { type CardNode, quoteCard, quoteFontSize } from '../quote-card';
import { quoteImageParams } from '../quote-image-route';

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
      'BFMTV · 13 OCTOBRE 2026',
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
  expect(quoteImageParams(`/interventions/${id}/citation/641/image.png`)).toEqual({ id, t: 641 });
  expect(quoteImageParams(`/interventions/${id}/citation/abc/image.png`)).toBeNull();
  expect(quoteImageParams('/interventions/../citation/1/image.png')).toBeNull();
});
