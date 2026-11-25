// @vitest-environment happy-dom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { renderToString } from 'react-dom/server';

import type { InterventionCardData } from '@/components/InterventionCard';
import { fakeApi } from '@/test/trpc';

import PastSection from '../PastSection';

const card = (i: number): InterventionCardData => ({
  id: `id-${i}`,
  title: `Intervention ${i}`,
  outlet: 'BFMTV',
  kind: 'tv',
  themes: [],
  status: 'past',
  date: '2026-10-13T08:00:00.000Z',
  thumbnailUrl: null,
});

const props = {
  theme: null,
  format: null,
  items: [1, 2, 3, 4].map(card),
  nextCursor: 'c1',
  cursor: null,
  olderHref: '/?avant=c1',
  newestHref: null,
  failed: false,
};

class Observer {
  static last: Observer | null = null;
  constructor(public callback: IntersectionObserverCallback) {
    Observer.last = this;
  }
  observe() {}
  disconnect() {}
  fire() {
    this.callback([{ isIntersecting: true } as IntersectionObserverEntry], this as never);
  }
}

beforeEach(() => {
  vi.stubGlobal('IntersectionObserver', Observer);
});

test('HTML du serveur : cartes, compteur et lien vers les plus anciennes (sans JavaScript)', () => {
  const html = renderToString(<PastSection {...props} />);
  expect(html).toContain('Intervention 4');
  expect(html).toContain('href="/?avant=c1"');
  expect(html).toContain('Interventions plus anciennes');
  expect(html).toMatch(/4<!-- -->\+<!-- --> intervention<!-- -->s/);
});

test('invitation à adhérer : bandeau sur téléphone, puis après la première rangée (2 ou 3 cartes)', () => {
  const { container } = render(<PastSection {...props} />);
  const items = [...container.querySelectorAll('ul > li')];
  expect(items[2]?.className).toContain('md:block lg:hidden');
  expect(items[4]?.className).toContain('lg:block');
  expect(screen.getAllByRole('heading', { name: /Vous partagez ces/ }).length).toBeGreaterThan(0);
});

test('chargement continu : la page suivante arrive en fin de liste, avec le même filtre', async () => {
  const api = fakeApi({
    'interventions.list': () => ({ items: [card(5)], nextCursor: null }),
  });
  render(<PastSection {...props} theme="security" />);
  await waitFor(() => expect(screen.queryByText('Interventions plus anciennes ›')).toBeNull());
  Observer.last?.fire();
  await screen.findByText('Intervention 5');
  expect(api.calls[0]).toMatchObject({
    procedure: 'interventions.list',
    input: { status: 'past', theme: 'security', cursor: 'c1', limit: 20 },
  });
  expect(screen.getByText(/^5\s*interventions$/)).toBeTruthy();
});

test('page suivante en échec : la liste reste, on peut réessayer', async () => {
  let fail = true;
  fakeApi({
    'interventions.list': () => {
      if (fail) throw new Error('panne');
      return { items: [card(5)], nextCursor: null };
    },
  });
  render(<PastSection {...props} />);
  await waitFor(() => expect(Observer.last).not.toBeNull());
  Observer.last?.fire();
  const retry = await screen.findByRole(
    'button',
    { name: 'Chargement impossible. Réessayer' },
    { timeout: 4000 },
  );
  expect(screen.getByText('Intervention 4')).toBeTruthy();
  fail = false;
  fireEvent.click(retry);
  await screen.findByText('Intervention 5');
});

test('aucune passée : message selon les filtres', () => {
  const { rerender } = render(
    <PastSection {...props} items={[]} nextCursor={null} olderHref={null} />,
  );
  expect(screen.getByText('Les interventions de David Lisnard apparaîtront ici.')).toBeTruthy();
  rerender(
    <PastSection {...props} items={[]} nextCursor={null} olderHref={null} theme="security" />,
  );
  expect(
    screen.getByText('Aucune intervention ne correspond à ce thème pour l’instant.'),
  ).toBeTruthy();
  rerender(<PastSection {...props} items={[]} nextCursor={null} olderHref={null} format="clip" />);
  expect(
    screen.getByText('Aucune intervention ne correspond à ces filtres pour l’instant.'),
  ).toBeTruthy();
});

test('page servie sans les passées (API en échec) : chargement côté navigateur', async () => {
  fakeApi({ 'interventions.list': () => ({ items: [card(9)], nextCursor: null }) });
  render(<PastSection {...props} items={[]} nextCursor={null} failed />);
  await screen.findByText('Intervention 9');
});
