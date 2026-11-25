import { INDEPENDENCE_NOTICE } from '../../config/app';
import { interventionDescription, interventionTitle } from '../intervention-meta';
import {
  fingerprint,
  homeStructuredData,
  httpsOnly,
  type InterventionSeo,
  interventionStructuredData,
  jsonLd,
} from '../seo';

const ID = '0b6f6f0e-1111-4222-8333-444455556666';
const video: InterventionSeo = {
  id: ID,
  title: 'Lisnard face à <script>alert("x")</script> & Cie',
  outlet: 'BFMTV',
  kind: 'tv',
  date: '2026-10-13T08:00:00.000Z',
  thumbnailUrl: 'https://i.ytimg.com/vi/abc/hq720.jpg',
  media: { kind: 'embed', embedUrl: 'https://www.youtube.com/embed/abc' },
  summary: { text: 'Il détaille son projet. '.repeat(20), points: ['Un point <b>', 'Deux'] },
};
const article: InterventionSeo = {
  ...video,
  thumbnailUrl: null,
  media: { kind: 'link' },
  summary: { text: 'NE DOIT JAMAIS APPARAÎTRE', points: ['NON'] },
};

test('vidéo : titre daté, description courte, VideoObject', () => {
  expect(interventionTitle(video)).toContain('13 octobre 2026');
  const description = interventionDescription(video);
  expect(description).toContain('BFMTV, 13 octobre 2026.');
  expect(description.length).toBeLessThan(260);
  expect(interventionStructuredData(video, 'https://play.test')).toMatchObject({
    '@type': 'VideoObject',
    name: video.title,
    url: `https://play.test/interventions/${ID}`,
    uploadDate: video.date,
    embedUrl: 'https://www.youtube.com/embed/abc',
    thumbnailUrl: ['https://i.ytimg.com/vi/abc/hq720.jpg'],
  });
});

test('presse : métadonnées seulement, jamais de résumé (ADR 0021)', () => {
  const all =
    interventionDescription(article) +
    JSON.stringify(interventionStructuredData(article, 'https://play.test'));
  expect(all).not.toContain('NE DOIT JAMAIS');
  expect(all).not.toContain('NON');
  expect(interventionStructuredData(article, 'https://play.test')['@type']).toBe('WebPage');
});

test('JSON-LD : < > et & échappés, donnée intacte', () => {
  const json = jsonLd({ a: '</script><x>&' });
  expect(json).not.toMatch(/[<>&]/);
  expect(JSON.parse(json).a).toBe('</script><x>&');
  expect(jsonLd(interventionStructuredData(video, 'https://play.test'))).not.toContain('<script>');
});

test('accueil : WebSite et Organization indépendante', () => {
  const graph = homeStructuredData('https://play.test')['@graph'];
  expect(graph.map((n) => n['@type'])).toEqual(['WebSite', 'Organization']);
  expect(graph[1]?.description).toBe(INDEPENDENCE_NOTICE);
  expect(graph[1]).toMatchObject({ logo: 'https://play.test/icons/icon-512.png' });
});

test('image : seulement en https ; empreinte stable et sensible au texte', () => {
  expect(httpsOnly('http://x.test/a.jpg')).toBeNull();
  expect(httpsOnly(null)).toBeNull();
  expect(httpsOnly('https://x.test/a.jpg')).toBe('https://x.test/a.jpg');
  expect(fingerprint('Un')).toBe(fingerprint('Un'));
  expect(fingerprint('Un')).not.toBe(fingerprint('Deux'));
});
