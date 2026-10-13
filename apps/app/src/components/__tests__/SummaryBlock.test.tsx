import { fireEvent, render, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';

import { LinkCard } from '../LinkCard';
import { SummaryBlock } from '../SummaryBlock';

test('résumé : texte, points clés et mention de génération automatique', async () => {
  await render(
    <SummaryBlock
      text="Il estime que les devoirs à la maison doivent revenir."
      points={['devoirs', 'école']}
    />,
  );
  expect(screen.getByText('Résumé')).toBeTruthy();
  expect(screen.getByText('Il estime que les devoirs à la maison doivent revenir.')).toBeTruthy();
  expect(screen.getByText('devoirs')).toBeTruthy();
  expect(screen.getByText('école')).toBeTruthy();
  expect(screen.getByText('Résumé généré automatiquement.')).toBeTruthy();
});

test('carte de lien : ouvre l’URL reçue (celle de l’éditeur pour un article Google News)', async () => {
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  await render(
    <LinkCard url="https://www.lejdd.fr/article" og={{}} outlet="lejdd.fr" shownTexts={[]} />,
  );
  await fireEvent.press(screen.getByRole('link'));
  expect(open).toHaveBeenCalledWith('https://www.lejdd.fr/article');
});
