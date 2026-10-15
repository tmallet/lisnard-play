import { render, screen } from '@testing-library/react-native';

import type { Marker, TimelineIntervention } from '@/lib/timeline';

import { TimelineCard } from '../TimelineCard';

jest.mock('expo-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

const item = (id: string): TimelineIntervention => ({
  id,
  day: '2026-10-13',
  title: `Intervention ${id}`,
  outlet: 'BFMTV',
  thumbnailUrl: null,
  official: false,
  live: false,
});
const base = { x: 0, y: 0, size: 22, day: '2026-10-13', members: 55903 };

test('carte d’une intervention : titre, média, total du jour, lien', async () => {
  const marker: Marker = { ...base, type: 'item', key: 'a', item: item('a') };
  await render(<TimelineCard marker={marker} />);
  expect(screen.getByText('Intervention a')).toBeTruthy();
  expect(screen.getByText(/55\s903 adhérents ce jour-là/)).toBeTruthy();
  expect(screen.getByText('Voir l’intervention')).toBeTruthy();
});

test('carte « +N » : liste des interventions regroupées', async () => {
  const marker: Marker = { ...base, type: 'more', key: 'more', items: [item('b'), item('c')] };
  await render(<TimelineCard marker={marker} />);
  expect(screen.getByText('Intervention b')).toBeTruthy();
  expect(screen.getByText('Intervention c')).toBeTruthy();
});
