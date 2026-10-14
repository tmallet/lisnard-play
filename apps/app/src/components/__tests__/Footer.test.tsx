import { render, screen } from '@testing-library/react-native';

import { INDEPENDENCE_NOTICE } from '@/config/app';

import { Footer } from '../Footer';

test('affiche la mention d’indépendance et le lien vers les mentions légales', async () => {
  await render(<Footer />);
  expect(screen.getByText(INDEPENDENCE_NOTICE)).toBeTruthy();
  expect(screen.getByText('Mentions légales et confidentialité')).toBeTruthy();
});
