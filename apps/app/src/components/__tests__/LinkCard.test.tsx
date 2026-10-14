import { render, screen } from '@testing-library/react-native';

import { LinkCard } from '../LinkCard';

const title = 'David Lisnard souhaite des travaux d’intérêt général';

describe('LinkCard', () => {
  it('ne répète pas un titre Open Graph identique au titre de l’écran', async () => {
    await render(
      <LinkCard url="https://example.com" og={{ title }} outlet="BFM" shownTexts={[title]} />,
    );
    expect(screen.queryByText(title)).toBeNull();
    expect(screen.getByText('BFM')).toBeTruthy();
    expect(screen.getByText('Ouvrir la source ↗')).toBeTruthy();
  });

  it('affiche un titre et une description qui apportent une information', async () => {
    await render(
      <LinkCard
        url="https://example.com"
        og={{ title: 'Entretien exclusif', description: 'Il détaille son programme.' }}
        outlet="BFM"
        shownTexts={[title]}
      />,
    );
    expect(screen.getByText('Entretien exclusif')).toBeTruthy();
    expect(screen.getByText('Il détaille son programme.')).toBeTruthy();
  });
});
