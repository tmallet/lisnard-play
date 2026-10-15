import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { CardGrid, GridRow } from '../CardGrid';

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

test('rangée pleine : un <GridRow> occupe toute la largeur, les cartes restent en colonnes', async () => {
  await render(
    <CardGrid>
      <Text>Carte</Text>
      <GridRow>
        <Text>Encart</Text>
      </GridRow>
    </CardGrid>,
  );
  const cellOf = (label: string) => screen.getByText(label).parent;
  expect(String(cellOf('Carte')?.props.className)).toContain('lg:w-1/3');
  expect(String(cellOf('Encart')?.props.className)).not.toContain('lg:w-1/3');
});
