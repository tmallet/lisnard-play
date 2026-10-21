import { indexingAllowed, publicOrigin, robotsTxt } from '../indexing';
import { sitemapXml } from '../sitemap';

test('indexation bloquée par défaut, levée seulement par « true »', () => {
  expect(indexingAllowed(undefined)).toBe(false);
  expect(indexingAllowed('')).toBe(false);
  expect(indexingAllowed('TRUE ')).toBe(false);
  expect(indexingAllowed('1')).toBe(false);
  expect(indexingAllowed('true')).toBe(true);
});

test('robots.txt selon la politique', () => {
  expect(robotsTxt(false)).toBe('User-agent: *\nDisallow: /\n');
  expect(robotsTxt(true)).toBe('User-agent: *\nAllow: /\nDisallow: /admin\n');
  expect(robotsTxt(true, 'https://play.projetlisnard.fr')).toBe(
    'User-agent: *\nAllow: /\nDisallow: /admin\nSitemap: https://play.projetlisnard.fr/sitemap.xml\n',
  );
  expect(robotsTxt(false, 'https://play.projetlisnard.fr')).not.toContain('Sitemap');
});

test('domaine public : en-têtes du proxy, sinon l’adresse reçue', () => {
  const behindProxy = new Request('http://localhost:3000/robots.txt', {
    headers: { 'x-forwarded-proto': 'https', 'x-forwarded-host': 'play.projetlisnard.fr' },
  });
  expect(publicOrigin(behindProxy)).toBe('https://play.projetlisnard.fr');
  expect(publicOrigin(new Request('http://localhost:8083/sitemap.xml'))).toBe(
    'http://localhost:8083',
  );
});

test('plan du site : pages fixes, interventions et citations en adresses absolues', () => {
  const xml = sitemapXml('https://play.projetlisnard.fr', {
    interventions: [{ id: 'abc', updated: '2026-10-15' }],
    quotes: [{ itemId: 'abc', startS: 641, updated: '2026-10-15' }],
  });
  expect(xml).toContain('<loc>https://play.projetlisnard.fr/</loc>');
  expect(xml).toContain('<loc>https://play.projetlisnard.fr/campagne</loc>');
  expect(xml).toContain(
    '<url><loc>https://play.projetlisnard.fr/interventions/abc</loc><lastmod>2026-10-15</lastmod></url>',
  );
  expect(xml).toContain('<loc>https://play.projetlisnard.fr/interventions/abc/citation/641</loc>');
  expect(sitemapXml('https://a&b', { interventions: [], quotes: [] })).toContain(
    'https://a&#38;b/',
  );
});
