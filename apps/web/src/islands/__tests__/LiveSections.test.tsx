// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';

import type { InterventionCardData } from '@/components/InterventionCard';
import { fakeApi } from '@/test/trpc';

import LiveSections from '../LiveSections';

const live: InterventionCardData = {
  id: 'live',
  title: 'Meeting à Marseille',
  outlet: 'David Lisnard',
  kind: 'meeting',
  themes: [],
  status: 'live',
  date: new Date().toISOString(),
  thumbnailUrl: null,
};

beforeEach(() => {
  fakeApi({ 'notifications.config': () => ({ vapidPublicKey: null }) });
});

test('un direct en cours : section « En direct » en premier, en émeraude', () => {
  render(<LiveSections theme={null} live={[live]} upcoming={[]} renderedAt={Date.now()} />);
  const heading = screen.getByRole('heading', { name: 'En direct' });
  expect(heading.className).toContain('text-emeraude');
  expect(screen.getByText('Meeting à Marseille')).toBeTruthy();
  expect(screen.queryByRole('heading', { name: 'À venir' })).toBeNull();
});

test('ni direct ni à venir : aucune section vide', () => {
  render(<LiveSections theme={null} live={[]} upcoming={[]} renderedAt={Date.now()} />);
  expect(screen.queryByRole('heading')).toBeNull();
});
