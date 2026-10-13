import { APP_NAME, pageTitle } from '../app';

test('le titre de page dérive de APP_NAME', () => {
  expect(pageTitle()).toBe(APP_NAME);
  expect(pageTitle('À propos')).toBe(`À propos · ${APP_NAME}`);
});
