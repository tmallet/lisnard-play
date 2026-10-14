import { fireEvent, render, screen } from '@testing-library/react-native';

import { PlayerConsent } from '../PlayerConsent';

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
