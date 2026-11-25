// @vitest-environment happy-dom
import { act, fireEvent, render, screen } from '@testing-library/react';

import { PLAY_EVENT } from '@/lib/player';

import PlayerConsent from '../PlayerConsent';

const props = {
  embedUrl: 'https://www.youtube.com/embed/abc',
  provider: 'youtube',
  title: 'Entretien',
  posterUrl: 'https://i.ytimg.com/vi/abc/hqdefault.jpg',
  sourceUrl: 'https://www.youtube.com/watch?v=abc',
};

test('aucun lecteur avant le clic ; l’affiche mène à la vidéo sans JavaScript', () => {
  const { container } = render(<PlayerConsent {...props} />);
  expect(container.querySelector('iframe')).toBeNull();
  const poster = screen.getByRole('link', { name: 'Lire la vidéo sur YouTube' });
  expect(poster.getAttribute('href')).toBe(props.sourceUrl);
  expect(screen.getByText(/qui peut alors déposer des cookies/)).toBeTruthy();
});

test('après le clic : YouTube sans cookie, en lecture automatique', () => {
  const { container } = render(<PlayerConsent {...props} startS={125} />);
  fireEvent.click(screen.getByRole('link', { name: 'Lire la vidéo sur YouTube' }));
  const src = container.querySelector('iframe')?.getAttribute('src') ?? '';
  expect(src.startsWith('https://www.youtube-nocookie.com/embed/abc')).toBe(true);
  expect(src).toContain('autoplay=1');
  expect(src).toContain('start=123');
});

test('écouter un passage : le lecteur se charge à ce moment (le geste vaut consentement)', () => {
  const { container } = render(<PlayerConsent {...props} />);
  act(() => {
    window.dispatchEvent(new CustomEvent(PLAY_EVENT, { detail: 600 }));
  });
  expect(container.querySelector('iframe')?.getAttribute('src')).toContain('start=598');
});
