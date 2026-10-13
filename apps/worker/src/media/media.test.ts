import { describe, expect, test } from 'bun:test';
import { resolve as resolvePath } from 'node:path';

import { decodeGoogleNewsUrl, extractPublisherUrl } from './google-news';
import { extractPlayerUrl, minimalLink, resolveMedia } from './resolve';
import { isPrivateAddress, safeFetchText, UnsafeUrlError } from './safe-fetch';

const fixture = (name: string) =>
  Bun.file(resolvePath(import.meta.dir, '..', '__fixtures__', name));
const publicDns = async () => ['142.250.75.238'];

/** fetch factice indexé par préfixe d'URL. */
function routes(map: Record<string, () => Response | Promise<Response>>): typeof fetch {
  return (async (input: string | URL | Request) => {
    const url = String(input);
    const key = Object.keys(map).find((k) => url.startsWith(k));
    if (!key) throw new Error(`réseau injoignable : ${url}`);
    return (map[key] as () => Response)();
  }) as typeof fetch;
}

const target = {
  url: 'https://www.youtube.com/watch?v=Dpe_J7T0ztw',
  title: 'Face à Apolline',
  outlet: 'David Lisnard',
};

describe('adresses', () => {
  test('refuse boucle locale, privées, link-local, CGNAT et IPv6 locales', () => {
    for (const ip of [
      '127.0.0.1',
      '10.0.0.5',
      '172.20.1.1',
      '192.168.1.16',
      '169.254.169.254',
      '100.64.0.1',
      '0.0.0.0',
      '::1',
      'fd00::1',
      'fe80::1',
      '::ffff:10.0.0.1',
    ])
      expect(isPrivateAddress(ip)).toBe(true);
    for (const ip of ['142.250.75.238', '151.101.1.69', '2a00:1450:4007:80b::200e'])
      expect(isPrivateAddress(ip)).toBe(false);
  });

  test('une URL qui résout vers une IP privée est refusée', async () => {
    const error = await safeFetchText('https://intranet.example', {
      resolve: async () => ['10.1.2.3'],
      fetch: routes({}),
    }).catch((e) => e);
    expect(error).toBeInstanceOf(UnsafeUrlError);
  });

  test('une redirection vers une IP privée est refusée', async () => {
    const fetch = routes({
      'https://site.example/': () =>
        new Response(null, { status: 302, headers: { location: 'http://169.254.169.254/latest' } }),
    });
    const error = await safeFetchText('https://site.example/a', {
      fetch,
      resolve: publicDns,
    }).catch((e) => e);
    expect(error).toBeInstanceOf(UnsafeUrlError);
  });

  test('protocole autre que http(s) refusé', async () => {
    expect(
      await safeFetchText('file:///etc/passwd', { resolve: publicDns }).catch((e) => e),
    ).toBeInstanceOf(UnsafeUrlError);
  });
});

describe('rendu média', () => {
  test('YouTube : lecteur intégré, seule l’URL du lecteur est conservée', async () => {
    const fetch = routes({
      'https://www.youtube.com/oembed': async () =>
        Response.json(await fixture('oembed-youtube.json').json()),
    });
    const media = await resolveMedia(target, { fetch, resolve: publicDns });
    expect(media).toEqual({
      kind: 'embed',
      provider: 'youtube',
      embedUrl: 'https://www.youtube.com/embed/Dpe_J7T0ztw?feature=oembed',
    });
  });

  test('iframe vers un hôte non conforme : refusée', () => {
    const provider = {
      name: 'youtube' as const,
      matches: /x/,
      endpoint: '',
      playerHosts: ['www.youtube.com'],
    };
    expect(
      extractPlayerUrl('<iframe src="https://evil.example/embed/x"></iframe>', provider),
    ).toBeNull();
    expect(
      extractPlayerUrl('<iframe src="http://www.youtube.com/embed/x"></iframe>', provider),
    ).toBeNull();
  });

  test('intégration désactivée (oEmbed 401) : lien minimal', async () => {
    const fetch = routes({
      'https://www.youtube.com/oembed': () => new Response('Unauthorized', { status: 401 }),
    });
    expect(await resolveMedia(target, { fetch, resolve: publicDns })).toEqual(minimalLink(target));
  });

  test('article : carte de lien depuis les balises Open Graph', async () => {
    const html = `<html><head><meta property="og:title" content="L&#039;invité du jour"><meta content="https://img.example/a.jpg" property="og:image"><meta property="og:site_name" content="Le Figaro"></head><body>…</body></html>`;
    const fetch = routes({
      'https://www.lefigaro.fr/': () =>
        new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } }),
    });
    const media = await resolveMedia(
      { url: 'https://www.lefigaro.fr/politique/x', title: 'Titre', outlet: 'Le Figaro' },
      { fetch, resolve: publicDns },
    );
    expect(media).toEqual({
      kind: 'link',
      og: { title: "L'invité du jour", siteName: 'Le Figaro', image: 'https://img.example/a.jpg' },
    });
  });

  const GN_URL =
    'https://news.google.com/rss/articles/CBMiggFBVV95cUxNa19jQzh6ZlNTZEZTYXNISEtVRXVTM1ZFNjRCenN3blk2eXZ4cmVkZm1ucFlMSjB4cmtwbXhnekdGVTczNnFlTXEwRGFpMUtRYU1nRlFhS1R1MjdrUFJnaFV3VkF4cFZqUTg3djAyVG5GRmw3RXBpc3hTNDE4bmItVDF3?oc=5';
  const PUBLISHER = 'https://www.lejdd.fr/sommaire/david-lisnard-il-se-passe-quelque-chose-185973';
  const html = (body: string) => () =>
    new Response(body, { headers: { 'content-type': 'text/html; charset=utf-8' } });
  const googleNews = async (publisher: () => Response | Promise<Response>) =>
    routes({
      'https://news.google.com/rss/articles/': html(
        await fixture('google-news-article.html').text(),
      ),
      'https://news.google.com/_/DotsSplashUi/data/batchexecute': async () =>
        new Response(await fixture('google-news-batchexecute.txt').text()),
      'https://www.lejdd.fr/': publisher,
    });
  const gnTarget = {
    url: GN_URL,
    title: 'David Lisnard : "Il se passe quelque chose"',
    outlet: 'lejdd.fr',
  };

  test('Google News : URL de l’éditeur décodée, puis balises de partage de sa page', async () => {
    const fetch = await googleNews(html(await fixture('publisher-article.html').text()));
    expect(await decodeGoogleNewsUrl(GN_URL, { fetch, resolve: publicDns })).toBe(PUBLISHER);
    const media = await resolveMedia(gnTarget, { fetch, resolve: publicDns });
    expect(media.kind).toBe('link');
    if (media.kind !== 'link') return;
    expect(media.url).toBe(PUBLISHER);
    expect(media.og.siteName).toBe('lejdd.fr');
    expect(media.og.image).toStartWith('https://static.lejdd.fr/');
    // HTML encodé dans l'accroche retiré, longueur bornée, corps de l'article jamais repris.
    expect(media.og.description).toStartWith('À LA UNE DU JDNews');
    expect(media.og.description).not.toContain('<br');
    expect(media.og.description?.length).toBeLessThanOrEqual(300);
    expect(JSON.stringify(media)).not.toContain('jamais lu');
  });

  test('Google News : page de l’éditeur refusée, lien minimal vers l’éditeur', async () => {
    const fetch = await googleNews(() => new Response('Forbidden', { status: 403 }));
    expect(await resolveMedia(gnTarget, { fetch, resolve: publicDns })).toEqual({
      ...minimalLink(gnTarget),
      url: PUBLISHER,
    });
  });

  test('Google News : décodage impossible, lien minimal', async () => {
    const fetch = routes({
      'https://news.google.com/rss/articles/': html(
        '<html><body>Consentement requis</body></html>',
      ),
    });
    expect(await resolveMedia(gnTarget, { fetch, resolve: publicDns })).toEqual(
      minimalLink(gnTarget),
    );
  });

  test('URL de l’éditeur : https et hors des domaines Google', () => {
    expect(
      extractPublisherUrl('["https://www.google.com/x","https://news.google.com/y"]'),
    ).toBeNull();
    expect(extractPublisherUrl('["https://fonts.gstatic.com/a","https://www.rmc.fr/a"]')).toBe(
      'https://www.rmc.fr/a',
    );
    expect(extractPublisherUrl('["http://www.rmc.fr/a"]')).toBeNull();
  });

  test('site injoignable : lien minimal avec titre et média connus', async () => {
    const media = await resolveMedia(
      { url: 'https://down.example/a', title: 'Titre', outlet: 'Média' },
      { fetch: routes({}), resolve: publicDns },
    );
    expect(media).toEqual(minimalLink({ url: '', title: 'Titre', outlet: 'Média' }));
  });
});

describe('recalcul des rendus existants', () => {
  test('refreshMedia ne reprend que les contenus publiés de la source demandée', async () => {
    const { createTestDb } = await import('@lisnard/db/testing');
    const { item } = await import('@lisnard/db/schema');
    const { recordClassification, setMedia, upsertItem, upsertSources } = await import(
      '@lisnard/db/write'
    );
    const { refreshMedia } = await import('./task');
    const { db, drop } = await createTestDb();
    try {
      await upsertSources(db, [
        { id: 'rss:google-news', kind: 'rss', name: 'Google News', active: true },
        { id: 'yt:bfmtv', kind: 'youtube', name: 'BFMTV', active: true },
      ]);
      const add = async (sourceId: string, url: string) => {
        const { id } = await upsertItem(db, {
          sourceId,
          platformId: url,
          url,
          title: 'Titre',
          description: '',
          publishedAt: new Date('2026-06-01T00:00:00Z'),
        });
        await recordClassification(db, {
          itemId: id,
          model: 'm',
          questionsVersion: 3,
          inputHash: 'h',
          answers: {
            intervient: 1,
            role: { choice: 'national', confidence: 1, probabilities: {} },
            kind: { choice: 'presse', confidence: 1, probabilities: {} },
          },
          thresholds: null,
          outcome: 'published',
          role: 'national',
          kind: 'presse',
          themes: [],
        });
        await setMedia(db, id, { kind: 'link', og: {} });
      };
      await add('rss:google-news', 'https://down.example/article');
      await add('yt:bfmtv', 'https://down.example/video');
      const result = await refreshMedia(
        db,
        { fetch: routes({}), resolve: publicDns },
        'rss:google-news',
      );
      expect(result).toMatchObject({ total: 1, link: 1 });
      const rows = await db.select({ url: item.url, media: item.media }).from(item);
      const refreshed = rows.find((r) => r.url.endsWith('article'));
      expect(refreshed?.media).toEqual({
        kind: 'link',
        og: { title: 'Titre', siteName: 'Google News' },
      });
      expect(rows.find((r) => r.url.endsWith('video'))?.media).toEqual({ kind: 'link', og: {} });
    } finally {
      await drop();
    }
  });
});
