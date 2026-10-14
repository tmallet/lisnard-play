import { describe, expect, test } from 'bun:test';
import { resolve as resolvePath } from 'node:path';

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

  test('Google News : lien minimal sans requête', async () => {
    const media = await resolveMedia(
      { url: 'https://news.google.com/rss/articles/abc', title: 'Titre', outlet: 'RMC' },
      { fetch: routes({}), resolve: publicDns },
    );
    expect(media).toEqual({ kind: 'link', og: { title: 'Titre', siteName: 'RMC' } });
  });

  test('site injoignable : lien minimal avec titre et média connus', async () => {
    const media = await resolveMedia(
      { url: 'https://down.example/a', title: 'Titre', outlet: 'Média' },
      { fetch: routes({}), resolve: publicDns },
    );
    expect(media).toEqual(minimalLink({ url: '', title: 'Titre', outlet: 'Média' }));
  });
});
