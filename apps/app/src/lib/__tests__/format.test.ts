import { largeThumbnail, repeatsTitle } from '../format';

const title =
  '“Revoir l’excuse de minorité”: David Lisnard, candidat “Nouvelle Énergie” à la présidentielle';

describe('repeatsTitle', () => {
  it('reconnaît une description Google News qui répète le titre suivi du média', () => {
    expect(repeatsTitle(`${title} BFM`, title, 'BFM')).toBe(true);
  });

  it('ignore casse, accents et guillemets', () => {
    expect(repeatsTitle('"Revoir l\'excuse de minorite" : david lisnard', title)).toBe(true);
  });

  it('considère un texte absent comme redondant', () => {
    expect(repeatsTitle(null, title)).toBe(true);
    expect(repeatsTitle('BFM', title, 'BFM')).toBe(true);
  });

  it('garde un texte qui apporte une information', () => {
    expect(
      repeatsTitle(
        'Invité de la matinale, il détaille ses propositions sur la justice.',
        title,
        'BFM',
      ),
    ).toBe(false);
  });
});

describe('largeThumbnail', () => {
  it('passe une miniature YouTube en 16:9 haute définition', () => {
    expect(largeThumbnail('https://i.ytimg.com/vi/abc_123/hqdefault.jpg')).toBe(
      'https://i.ytimg.com/vi/abc_123/hq720.jpg',
    );
  });

  it('laisse les autres images inchangées', () => {
    expect(largeThumbnail('https://static.lejdd.fr/a.jpeg')).toBe('https://static.lejdd.fr/a.jpeg');
  });
});
