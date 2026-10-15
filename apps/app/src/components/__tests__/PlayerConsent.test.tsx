import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { PlayerConsent } from '../PlayerConsent';

// Hors navigateur de navigation : l'écran est « actif » au montage ; blur() simule la sortie.
let blur: (() => void) | undefined;
jest.mock('expo-router', () => ({
  useFocusEffect: (effect: () => (() => void) | undefined) => {
    const { useEffect } = require('react');
    useEffect(() => {
      blur = effect() ?? undefined;
    }, [effect]);
  },
}));

// Le lecteur réel (WebView) n'existe pas sous Jest : on affiche l'URL qu'il chargerait.
jest.mock('../MediaEmbed', () => {
  const { Text } = require('react-native');
  return { MediaEmbed: ({ embedUrl }: { embedUrl: string }) => <Text>lecteur {embedUrl}</Text> };
});

test('aucun lecteur avant le clic, puis YouTube sans cookie en lecture automatique', async () => {
  await render(
    <PlayerConsent
      embedUrl="https://www.youtube.com/embed/abc"
      provider="youtube"
      title="École"
      posterUrl="https://i.ytimg.com/vi/abc/hqdefault.jpg"
    />,
  );
  expect(screen.getByText('▶ Lire la vidéo')).toBeTruthy();
  expect(screen.getByText(/depuis YouTube, qui peut alors déposer des cookies/)).toBeTruthy();
  expect(screen.queryByText(/^lecteur/)).toBeNull();
  await fireEvent.press(screen.getByRole('button'));
  expect(
    screen.getByText('lecteur https://www.youtube-nocookie.com/embed/abc?autoplay=1'),
  ).toBeTruthy();
});

test('quitter l’écran arrête la vidéo : le lecteur laisse place à l’affiche', async () => {
  await render(
    <PlayerConsent
      embedUrl="https://www.youtube.com/embed/abc"
      provider="youtube"
      title="École"
      posterUrl={null}
    />,
  );
  await fireEvent.press(screen.getByRole('button'));
  expect(screen.queryByText(/^lecteur/)).toBeTruthy();
  await act(() => blur?.());
  expect(screen.queryByText(/^lecteur/)).toBeNull();
  expect(screen.getByText('▶ Lire la vidéo')).toBeTruthy();
});
