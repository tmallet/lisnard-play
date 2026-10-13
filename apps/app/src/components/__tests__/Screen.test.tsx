import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { Text } from 'react-native';

import { APP_NAME, INDEPENDENCE_NOTICE } from '@/config/app';

import { Screen } from '../Screen';

jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);

let client: QueryClient;
afterEach(() => client?.clear());

async function renderScreen(ui: ReactElement) {
  client = new QueryClient({ defaultOptions: { queries: { gcTime: Number.POSITIVE_INFINITY } } });
  await render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

// jest-expo cible iOS : c'est la variante mobile (Screen.tsx) qui est testée.
test('affiche le contenu et la mention en pied de page, sans surtitre', async () => {
  await renderScreen(
    <Screen>
      <Text>Contenu</Text>
    </Screen>,
  );
  expect(screen.getByText('Contenu')).toBeTruthy();
  expect(screen.getByText(INDEPENDENCE_NOTICE)).toBeTruthy();
  expect(screen.queryByText(APP_NAME)).toBeNull();
});

test('footer={false} retire le pied de page (écran qui affiche déjà la mention)', async () => {
  await renderScreen(
    <Screen footer={false}>
      <Text>Contenu</Text>
    </Screen>,
  );
  expect(screen.queryByText(INDEPENDENCE_NOTICE)).toBeNull();
});

test('tirer pour actualiser : relance les requêtes affichées', async () => {
  await renderScreen(
    <Screen>
      <Text>Contenu</Text>
    </Screen>,
  );
  const refetch = jest.spyOn(client, 'refetchQueries').mockResolvedValue();
  const control = screen.getByTestId('screen-scroll').props.refreshControl;
  await act(async () => {
    await control.props.onRefresh();
  });
  expect(refetch).toHaveBeenCalledWith({ type: 'active' });
});
