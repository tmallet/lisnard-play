// @vitest-environment happy-dom
import { fireEvent, render, screen } from '@testing-library/react';

import { PLAY_EVENT } from '@/lib/player';

import QuotesBlock from '../QuotesBlock';

const props = {
  itemId: 'b710101c-1a11-4810-b8f8-339a5d171995',
  title: 'Entretien',
  origin: 'https://play.test',
  quotes: [
    { text: 'L’État profond, c’est Bercy.', startS: 641, theme: 'economy' },
    { text: 'Deuxième citation.', startS: 900, theme: null },
  ],
};

test('citations : texte, minutage, page de la citation et thème', () => {
  render(<QuotesBlock {...props} />);
  expect(screen.getByText('« L’État profond, c’est Bercy. »')).toBeTruthy();
  expect(screen.getByText('Économie')).toBeTruthy();
  expect(screen.getAllByRole('link', { name: 'Voir la citation' })[0]?.getAttribute('href')).toBe(
    `/interventions/${props.itemId}/citation/641`,
  );
});

test('écouter : le lecteur est appelé au passage et l’adresse garde le minutage', () => {
  const heard: number[] = [];
  window.addEventListener(PLAY_EVENT, (e) => heard.push((e as CustomEvent<number>).detail));
  render(<QuotesBlock {...props} />);
  fireEvent.click(screen.getByRole('link', { name: 'Écouter le passage à 10:41' }));
  expect(heard).toEqual([641]);
  expect(window.location.search).toContain('t=641');
});

test('partager : lien, image et X dépliés pour la seule citation choisie', () => {
  render(<QuotesBlock {...props} />);
  expect(screen.queryByText('Image')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Partager la citation à 10:41' }));
  expect(screen.getByText('Lien')).toBeTruthy();
  expect(screen.getByText('Image').getAttribute('href')).toBe(
    `/interventions/${props.itemId}/citation/641/image.png`,
  );
  const x = new URL(screen.getByText('X').getAttribute('href') ?? '');
  expect(x.hostname).toBe('twitter.com');
  expect(x.searchParams.get('url')).toBe(
    `https://play.test/interventions/${props.itemId}/citation/641`,
  );
  expect(screen.getAllByText('Image')).toHaveLength(1);
});

test('sans citation : rien n’est affiché', () => {
  const { container } = render(<QuotesBlock {...props} quotes={[]} />);
  expect(container.innerHTML).toBe('');
});
