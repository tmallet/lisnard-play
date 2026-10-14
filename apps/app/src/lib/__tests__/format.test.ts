import { kindLabelFor, largeThumbnail, liveSince, repeatsTitle, whenLabel } from '../format';

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

describe('libellés de direct', () => {
  const start = '2026-10-14T07:00:00.000Z';
  const at = (minutes: number) => new Date(Date.parse(start) + minutes * 60_000);

  it('durée écoulée depuis le début', () => {
    expect(liveSince(start, at(0))).toBe('Commencé à l’instant');
    expect(liveSince(start, at(12))).toBe('Commencé il y a 12 min');
    expect(liveSince(start, at(65))).toBe('Commencé il y a 1 h 05');
  });

  it('type « Direct » et date selon le statut', () => {
    expect(kindLabelFor('live', 'tv')).toBe('Direct');
    expect(kindLabelFor('past', 'tv')).toBe('Télévision');
    expect(whenLabel('live', start, at(12))).toBe('Commencé il y a 12 min');
    expect(whenLabel('past', start)).toBe('14 octobre 2026');
  });
});
