import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { CardGrid } from '../CardGrid';

test('grille : chaque carte est rendue dans sa cellule', async () => {
  await render(
    <CardGrid>
      <Text>Carte 1</Text>
      <Text>Carte 2</Text>
      <Text>Carte 3</Text>
    </CardGrid>,
  );
  for (const label of ['Carte 1', 'Carte 2', 'Carte 3'])
    expect(screen.getByText(label)).toBeTruthy();
});
