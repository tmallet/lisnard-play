import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { APP_NAME, INDEPENDENCE_NOTICE } from '@/config/app';

import { Screen } from '../Screen';

jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);

// jest-expo cible iOS : c'est la variante mobile (Screen.tsx) qui est testée.
test('affiche le contenu et la mention en pied de page, sans surtitre', async () => {
  await render(
    <Screen>
      <Text>Contenu</Text>
    </Screen>,
  );
  expect(screen.getByText('Contenu')).toBeTruthy();
  expect(screen.getByText(INDEPENDENCE_NOTICE)).toBeTruthy();
  expect(screen.queryByText(APP_NAME)).toBeNull();
});

test('footer={false} retire le pied de page (écran qui affiche déjà la mention)', async () => {
  await render(
    <Screen footer={false}>
      <Text>Contenu</Text>
    </Screen>,
  );
  expect(screen.queryByText(INDEPENDENCE_NOTICE)).toBeNull();
});
