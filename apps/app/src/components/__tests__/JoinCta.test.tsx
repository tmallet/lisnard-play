import { fireEvent, render, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';

import { JOIN } from '@/config/join';

import { JoinCta } from '../JoinCta';

test('invitation : ouvre le lien d’adhésion et signale le parrainage', async () => {
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  await render(<JoinCta />);
  expect(screen.getByRole('heading').props.children).toBeTruthy();
  expect(screen.getByText(/Lien de parrainage de l’éditeur/)).toBeTruthy();
  await fireEvent.press(screen.getByText(`${JOIN.button} ↗`));
  expect(open).toHaveBeenCalledWith(JOIN.url);
  // Aucun paramètre de suivi ajouté au lien (ADR 0025).
  expect(JOIN.url).not.toMatch(/utm_|fbclid|gclid/);
});

test('encart compact (accueil) : parrainage toujours signalé, bouton court', async () => {
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  await render(<JoinCta compact />);
  expect(screen.getByText(JOIN.disclosureShort)).toBeTruthy();
  await fireEvent.press(screen.getByText(`${JOIN.buttonShort} ↗`));
  expect(open).toHaveBeenCalledWith(JOIN.url);
});
