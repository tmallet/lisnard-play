import { render, screen } from '@testing-library/react-native';

import { InterventionCard, type InterventionCardData } from '../InterventionCard';
import { LiveBadge } from '../LiveBadge';

jest.mock('expo-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

const base: InterventionCardData = {
  id: '1',
  title: 'L’invité de 7h50',
  outlet: 'France Inter',
  kind: 'radio',
  themes: [],
  status: 'past',
  date: '2026-10-13T05:50:00.000Z',
  thumbnailUrl: null,
};

test('badge « en direct »', async () => {
  await render(<LiveBadge />);
  expect(screen.getByText('En direct')).toBeTruthy();
});

test('carte passée : média, type et date en français', async () => {
  await render(<InterventionCard item={base} />);
  expect(screen.getByText('France Inter · Radio')).toBeTruthy();
  expect(screen.getByText('13 octobre 2026')).toBeTruthy();
  expect(screen.queryByText('En direct')).toBeNull();
});

test('carte en direct : thèmes (deux au plus, puis +N) et badge', async () => {
  await render(
    <InterventionCard
      item={{
        ...base,
        status: 'live',
        kind: 'discours',
        themes: ['economie', 'securite', 'campagne'],
      }}
    />,
  );
  expect(screen.getByText('France Inter · Discours · Économie, Sécurité +1')).toBeTruthy();
  expect(screen.getByText('En direct')).toBeTruthy();
});

test('carte à venir : date et heure de Paris', async () => {
  await render(
    <InterventionCard item={{ ...base, status: 'upcoming', date: '2026-10-14T16:00:00.000Z' }} />,
  );
  expect(screen.getByText(/14 octobre.*18:00/)).toBeTruthy();
});
