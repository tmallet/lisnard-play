import type { SitemapEntries } from '@lisnard/db/read';

/** Pages fixes du site, toujours présentes dans le plan. */
const STATIC_PATHS = ['/', '/campagne', '/a-propos', '/mentions-legales'];

const escapeXml = (value: string) => value.replace(/[<>&'"]/g, (c) => `&#${c.charCodeAt(0)};`);

/** Plan du site au format Sitemaps (spec app-shell), en adresses absolues sur `origin`. */
export function sitemapXml(origin: string, entries: SitemapEntries): string {
  const url = (path: string, updated?: string) =>
    `<url><loc>${escapeXml(origin + path)}</loc>${updated ? `<lastmod>${updated}</lastmod>` : ''}</url>`;
  const urls = [
    ...STATIC_PATHS.map((path) => url(path)),
    ...entries.interventions.map((i) => url(`/interventions/${i.id}`, i.updated)),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}
