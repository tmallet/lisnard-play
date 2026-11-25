/**
 * Contrôle de parité avant la bascule (change migrate-web-astro) : pour un échantillon
 * des adresses du plan du site, compare l'ancien service et le nouveau, sans JavaScript :
 * statut HTTP, titre, adresse canonique et type des données structurées. Le nouveau
 * service peut en dire plus (canonique sur une page qui n'en avait pas), jamais moins.
 *
 * Usage : bun scripts/parity-web.ts <ancien> <nouveau> [taille de l'échantillon, 40]
 * Exemple : bun scripts/parity-web.ts https://play.projetlisnard.fr https://web-preview.exemple
 */
const [oldBase, newBase, size = '40'] = process.argv.slice(2);
if (!oldBase || !newBase) {
  console.error('Usage : bun scripts/parity-web.ts <ancien> <nouveau> [taille]');
  process.exit(2);
}

interface Snapshot {
  status: number;
  location: string | null;
  title: string | null;
  canonical: string | null;
  types: string[];
}

const decode = (s: string) =>
  s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

async function snapshot(base: string, path: string): Promise<Snapshot> {
  const res = await fetch(new URL(path, base), { redirect: 'manual' });
  const html = res.headers.get('content-type')?.includes('html') ? await res.text() : '';
  const types = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)]
    .flatMap((m) => {
      try {
        const data = JSON.parse(m[1] ?? 'null');
        const nodes = data?.['@graph'] ?? [data];
        return nodes.map((n: { '@type'?: string }) => n?.['@type'] ?? '?');
      } catch {
        return ['invalide'];
      }
    })
    .sort();
  const title = /<title[^>]*>([^<]*)<\/title>/.exec(html)?.[1];
  // Chemin seulement : en local ou en prévisualisation, l'origine peut différer.
  const canonical = /<link rel="canonical" href="([^"]+)"/.exec(html)?.[1];
  const canonicalPath = canonical
    ? new URL(decode(canonical)).pathname + new URL(decode(canonical)).search
    : null;
  return {
    status: res.status,
    location: res.headers.get('location'),
    title: title ? decode(title).trim() : null,
    canonical: canonicalPath,
    types,
  };
}

/** Adresses : pages fixes, puis un échantillon régulier du plan du site de l'ancien service. */
const sitemap = await (await fetch(new URL('/sitemap.xml', oldBase))).text();
const all = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
  (m) => new URL(decode(m[1] ?? '')).pathname,
);
const fixed = [
  '/',
  '/campagne',
  '/campagne?vue=deplacements',
  '/a-propos',
  '/mentions-legales',
  '/notifications',
];
const rest = all.filter((p) => !fixed.includes(p));
const step = Math.max(1, Math.floor(rest.length / Number(size)));
const sample = [
  ...fixed,
  ...rest.filter((_, i) => i % step === 0).slice(0, Number(size)),
  '/adresse-inconnue',
];

let differences = 0;
for (const path of sample) {
  const [a, b] = await Promise.all([snapshot(oldBase, path), snapshot(newBase, path)]);
  const issues: string[] = [];
  // L'ancien service servait le gabarit en 200 et redirigeait dans le navigateur
  // (/adhesions, citation changée) : une redirection côté serveur est une amélioration.
  const redirected = b.status === 301 || b.status === 302;
  if (a.status !== b.status && !(a.status === 200 && redirected))
    issues.push(`statut ${a.status} → ${b.status}`);
  if (!redirected && a.title !== b.title) issues.push(`titre « ${a.title} » → « ${b.title} »`);
  if (a.canonical && a.canonical !== b.canonical)
    issues.push(`canonique ${a.canonical} → ${b.canonical ?? 'absente'}`);
  const lost = a.types.filter((t) => !b.types.includes(t));
  if (lost.length > 0) issues.push(`données structurées perdues : ${lost.join(', ')}`);
  differences += issues.length;
  console.log(
    `${issues.length ? '✗' : '✓'} ${path}${issues.length ? `\n    ${issues.join('\n    ')}` : ''}`,
  );
}

console.log(`\n${sample.length} adresses comparées, ${differences} écart(s).`);
process.exit(differences > 0 ? 1 : 0);
