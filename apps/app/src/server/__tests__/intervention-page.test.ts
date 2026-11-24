import { INDEPENDENCE_NOTICE } from '../../config/app';
import {
  homePageMeta,
  type InterventionAt,
  interventionPageMeta,
  interventionPageParams,
  readIntervention,
} from '../intervention-page';
import { jsonLdScript } from '../quote-page';

const ID = '0b6f6f0e-1111-4222-8333-444455556666';
const video: InterventionAt = {
  id: ID,
  title: 'Lisnard face à <script>alert("x")</script> & Cie',
  outlet: 'BFMTV',
  kind: 'tv',
  status: 'past',
  date: '2026-10-13T08:00:00.000Z',
  thumbnailUrl: 'https://i.ytimg.com/vi/abc/hq720.jpg',
  media: { kind: 'embed', embedUrl: 'https://www.youtube.com/embed/abc' },
  summary: { text: 'Il détaille son projet. '.repeat(20), points: ['Un point <b>', 'Deux'] },
};
const article: InterventionAt = {
  ...video,
  thumbnailUrl: null,
  media: { kind: 'link' },
  summary: { text: 'NE DOIT JAMAIS APPARAÎTRE', points: ['NON'] },
};

const jsonLd = (tags: string) =>
  JSON.parse(/<script type="application\/ld\+json">(.*?)<\/script>/s.exec(tags)?.[1] ?? 'null');

test('adresse : seulement /interventions/<uuid>', () => {
  expect(interventionPageParams(`/interventions/${ID}`)).toEqual({ id: ID });
  expect(interventionPageParams(`/interventions/${ID}/citation/12`)).toBeNull();
  expect(interventionPageParams('/interventions/x')).toBeNull();
  expect(interventionPageParams('/')).toBeNull();
});

test('vidéo : titre daté, canonique, Open Graph, Twitter, VideoObject', () => {
  const meta = interventionPageMeta(video, 'https://play.test');
  expect(meta.title).toContain('13 octobre 2026');
  expect(meta.title.endsWith('· Lisnard Play')).toBe(true);
  expect(meta.description).toContain('BFMTV, 13 octobre 2026.');
  expect(meta.description.length).toBeLessThan(260);
  expect(meta.ogType).toBe('video.other');
  expect(meta.tags).toContain(
    `<link rel="canonical" href="https://play.test/interventions/${ID}"/>`,
  );
  expect(meta.tags).toContain('content="summary_large_image"');
  expect(meta.tags).toContain('property="og:image" content="https://i.ytimg.com/vi/abc/hq720.jpg"');
  const data = jsonLd(meta.tags);
  expect(data).toMatchObject({
    '@type': 'VideoObject',
    uploadDate: video.date,
    embedUrl: 'https://www.youtube.com/embed/abc',
    thumbnailUrl: ['https://i.ytimg.com/vi/abc/hq720.jpg'],
  });
  expect(data.name).toBe(video.title);
});

test('échappement : aucun HTML issu des données ne survit', () => {
  const meta = interventionPageMeta(video, 'https://play.test');
  expect(meta.tags).not.toContain('<script>alert');
  expect(meta.tags.match(/<script/g)).toHaveLength(1);
  expect(meta.body).not.toContain('<script>');
  expect(meta.body).not.toContain('<b>');
  expect(meta.body).toContain('&#60;b&#62;');
});

test('presse : métadonnées seulement, jamais de résumé (ADR 0021)', () => {
  const meta = interventionPageMeta(article, 'https://play.test');
  const all = meta.title + meta.description + meta.tags + meta.body;
  expect(all).not.toContain('NE DOIT JAMAIS');
  expect(all).not.toContain('NON');
  expect(meta.ogType).toBe('article');
  expect(meta.tags).toContain('content="summary"');
  expect(meta.tags).toContain('/icons/icon-512.png');
  expect(jsonLd(meta.tags)['@type']).toBe('WebPage');
});

test('texte sans JavaScript : titre, description, résumé et points de la vidéo', () => {
  const body = interventionPageMeta(video, 'https://play.test').body ?? '';
  expect(body).toContain('<h1>');
  expect(body).toContain('Il détaille son projet.');
  expect(body).toContain('<li>Deux</li>');
});

test('JSON-LD : < > et & échappés, donnée intacte', () => {
  const out = jsonLdScript({ a: '</script><x>&' });
  const json = out.slice(out.indexOf('>') + 1, -'</script>'.length);
  expect(json).not.toMatch(/[<>&]/);
  expect(JSON.parse(json).a).toBe('</script><x>&');
});

test('accueil : canonique, carte Twitter, image, WebSite et Organization indépendante', () => {
  const meta = homePageMeta('https://play.test');
  expect(meta.tags).toContain('<link rel="canonical" href="https://play.test/"/>');
  expect(meta.tags).toContain('name="twitter:card" content="summary"');
  expect(meta.tags).toContain('https://play.test/icons/icon-512.png');
  const graph = jsonLd(meta.tags)['@graph'];
  expect(graph.map((n: { '@type': string }) => n['@type'])).toEqual(['WebSite', 'Organization']);
  expect(graph[1].description).toBe(INDEPENDENCE_NOTICE);
});

const api = (status: number, body: unknown) => async () =>
  new Response(JSON.stringify(body), { status });
const req = new Request('http://localhost/interventions/x');

test('lecture : donnée, 404 → null, autre échec → error', async () => {
  expect(await readIntervention(api(200, { result: { data: video } }), req, { id: ID })).toEqual(
    video,
  );
  expect(await readIntervention(api(404, {}), req, { id: ID })).toBeNull();
  expect(await readIntervention(api(500, {}), req, { id: ID })).toBe('error');
});
