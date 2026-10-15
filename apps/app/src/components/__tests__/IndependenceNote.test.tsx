import { render, screen } from '@testing-library/react-native';

import { INDEPENDENCE_NOTICE } from '@/config/app';

import { IndependenceNote } from '../IndependenceNote';

test('mention en tête (web sur téléphone) : mention d’indépendance et lien légal', async () => {
  await render(<IndependenceNote />);
  expect(screen.getByText(INDEPENDENCE_NOTICE)).toBeTruthy();
  expect(screen.getByText('Mentions légales et confidentialité')).toBeTruthy();
});
