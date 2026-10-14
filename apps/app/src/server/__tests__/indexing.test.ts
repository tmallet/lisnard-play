import { indexingAllowed, robotsTxt } from '../indexing';

test('indexation bloquée par défaut, levée seulement par « true »', () => {
  expect(indexingAllowed(undefined)).toBe(false);
  expect(indexingAllowed('')).toBe(false);
  expect(indexingAllowed('TRUE ')).toBe(false);
  expect(indexingAllowed('1')).toBe(false);
  expect(indexingAllowed('true')).toBe(true);
});

test('robots.txt selon la politique', () => {
  expect(robotsTxt(false)).toBe('User-agent: *\nDisallow: /\n');
  expect(robotsTxt(true)).toBe('User-agent: *\nAllow: /\n');
});
