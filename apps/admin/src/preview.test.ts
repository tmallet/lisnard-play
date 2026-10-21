import { expect, test } from 'bun:test';

import { withPreviewNumber } from './preview';

test('prévisualisation : {pr} remplacé par le numéro tiré du nom du conteneur', () => {
  const url = 'https://{pr}.lisnardplay.thimal.fr';
  expect(withPreviewNumber(url, 'abc123-pr-40')).toBe('https://40.lisnardplay.thimal.fr');
  expect(withPreviewNumber('https://play.projetlisnard.fr', 'abc123-pr-40')).toBe(
    'https://play.projetlisnard.fr',
  );
  // Hors prévisualisation, le service refuse de démarrer plutôt que de garder {pr}.
  expect(() => withPreviewNumber(url, 'abc123-20261021T080000')).toThrow();
  expect(() => withPreviewNumber(url, undefined)).toThrow();
  expect(() => withPreviewNumber('https://{{pr}}.lisnardplay.thimal.fr', 'abc123-pr-40')).toThrow();
});
