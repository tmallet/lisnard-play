// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';

import { InterventionCard, type InterventionCardData } from '../InterventionCard';

const base: InterventionCardData = {
  id: 'abc',
  title: 'Invité de la matinale',
  outlet: 'BFMTV',
  kind: 'tv',
  themes: [],
  status: 'past',
  date: '2026-10-13T08:00:00.000Z',
  thumbnailUrl: 'https://i.ytimg.com/vi/x/hqdefault.jpg',
};

test('carte passée : lien vers le détail, média, type et date en français', () => {
  render(<InterventionCard item={base} />);
  expect(screen.getByRole('link').getAttribute('href')).toBe('/interventions/abc');
  expect(screen.getByText('BFMTV · Télévision')).toBeTruthy();
  expect(screen.getByText('13 octobre 2026')).toBeTruthy();
  expect(screen.queryByText('En direct')).toBeNull();
});

test('miniature YouTube en haute définition, repli sur l’image d’origine', () => {
  const { container } = render(<InterventionCard item={base} />);
  const img = container.querySelector('img');
  expect(img?.getAttribute('src')).toBe('https://i.ytimg.com/vi/x/hq720.jpg');
  expect(img?.dataset.fallback).toBe(base.thumbnailUrl);
});

test('carte en direct : « Direct », durée écoulée, thèmes (deux au plus, puis +N) et badge', () => {
  const now = Date.now();
  render(
    <InterventionCard
      item={{
        ...base,
        status: 'live',
        date: new Date(now - 12 * 60_000).toISOString(),
        themes: ['economy', 'security', 'education'],
      }}
    />,
  );
  expect(screen.getByText('BFMTV · Direct · Économie, Sécurité +1')).toBeTruthy();
  expect(screen.getByText(/Commencé il y a 1[12] min/)).toBeTruthy();
  expect(screen.getByText('En direct')).toBeTruthy();
});

test('carte à venir : date et heure de Paris', () => {
  render(
    <InterventionCard item={{ ...base, status: 'upcoming', date: '2026-10-14T16:00:00.000Z' }} />,
  );
  expect(screen.getByText('mercredi 14 octobre à 18:00')).toBeTruthy();
});
