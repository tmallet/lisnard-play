// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';

import { JOIN } from '@/config/join';

import { JoinBar, JoinCta } from '../Join';

test('invitation : lien d’adhésion dans un nouvel onglet, parrainage signalé', () => {
  render(<JoinCta />);
  const link = screen.getByRole('link');
  expect(link.getAttribute('href')).toBe(JOIN.url);
  expect(link.getAttribute('target')).toBe('_blank');
  expect(link.getAttribute('rel')).toBe('noopener');
  expect(screen.getByText(JOIN.disclosure)).toBeTruthy();
  expect(screen.getByText(JOIN.pitch)).toBeTruthy();
});

test('encart compact et bandeau : parrainage toujours signalé, bouton court', () => {
  render(
    <>
      <JoinCta compact />
      <JoinBar />
    </>,
  );
  expect(screen.getAllByText(JOIN.disclosureShort)).toHaveLength(2);
  expect(screen.getAllByText(`${JOIN.buttonShort} ↗`)).toHaveLength(2);
  for (const link of screen.getAllByRole('link')) expect(link.getAttribute('href')).toBe(JOIN.url);
});
