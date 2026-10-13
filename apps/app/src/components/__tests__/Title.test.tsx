import { render, screen } from '@testing-library/react-native';

import { Title } from '../Title';

test('met en évidence un seul mot-clé, en chamois', async () => {
  await render(<Title highlight="David Lisnard">Toutes les interventions de David Lisnard</Title>);
  const highlights = screen.getAllByTestId('title-highlight');
  expect(highlights).toHaveLength(1);
  expect(highlights[0]).toHaveTextContent('David Lisnard');
  expect(screen.getByRole('heading')).toHaveTextContent(
    'Toutes les interventions de David Lisnard',
  );
});

test('sans mot-clé, aucune mise en évidence', async () => {
  await render(<Title>À propos</Title>);
  expect(screen.queryByTestId('title-highlight')).toBeNull();
});
