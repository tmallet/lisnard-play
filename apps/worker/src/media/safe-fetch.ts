/**
 * Lecture d'URL externes sécurisée (ADR 0017) : http(s) uniquement, refus des adresses
 * privées après résolution DNS (protection SSRF), redirections revalidées, délai de
 * 5 s et réponse limitée à 1 Mo.
 */
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

export const MAX_BYTES = 1_000_000;
const TIMEOUT_MS = 5_000;
const MAX_REDIRECTS = 3;

export type Resolver = (host: string) => Promise<string[]>;

const defaultResolver: Resolver = async (host) =>
  (await lookup(host, { all: true, verbatim: true })).map((a) => a.address);

/** Adresses non routables publiquement : boucle locale, privées, link-local, CGNAT, etc. */
export function isPrivateAddress(address: string): boolean {
  const v = isIP(address);
  if (v === 4) {
    const [a = 0, b = 0] = address.split('.').map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a >= 224
    );
  }
  if (v === 6) {
    const lower = address.toLowerCase();
    if (lower === '::1' || lower === '::') return true;
    if (lower.startsWith('::ffff:')) return isPrivateAddress(lower.slice(7));
    return /^f[cd]/.test(lower) || /^fe[89ab]/.test(lower);
  }
  return true;
}

export class UnsafeUrlError extends Error {}

async function assertPublicUrl(raw: string, resolve: Resolver): Promise<URL> {
  const url = new URL(raw);
  if (url.protocol !== 'http:' && url.protocol !== 'https:')
    throw new UnsafeUrlError(`protocole refusé : ${url.protocol}`);
  const host = url.hostname.replace(/^\[|\]$/g, '');
  const addresses = isIP(host) ? [host] : await resolve(host);
  if (addresses.length === 0 || addresses.some(isPrivateAddress))
    throw new UnsafeUrlError(`adresse non publique : ${host}`);
  return url;
}

/** Lit une URL publique et renvoie son corps texte (tronqué à 1 Mo). */
export async function safeFetchText(
  raw: string,
  options: { fetch?: typeof fetch; resolve?: Resolver; accept?: string } = {},
): Promise<{ url: string; status: number; body: string; contentType: string }> {
  const doFetch = options.fetch ?? fetch;
  const resolve = options.resolve ?? defaultResolver;
  let current = raw;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const url = await assertPublicUrl(current, resolve);
    const res = await doFetch(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        'User-Agent': 'Mozilla/5.0 (lisnard-play worker)',
        Accept: options.accept ?? '*/*',
      },
    });
    const location = res.headers.get('location');
    if (res.status >= 300 && res.status < 400 && location) {
      current = new URL(location, url).toString();
      continue;
    }
    return {
      url: url.toString(),
      status: res.status,
      contentType: res.headers.get('content-type') ?? '',
      body: await readLimited(res),
    };
  }
  throw new UnsafeUrlError('trop de redirections');
}

async function readLimited(res: Response): Promise<string> {
  if (!res.body) return '';
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (size < MAX_BYTES) {
    const { done, value } = await reader.read();
    if (done || !value) break;
    chunks.push(value);
    size += value.byteLength;
  }
  await reader.cancel().catch(() => {});
  return new TextDecoder().decode(Buffer.concat(chunks).subarray(0, MAX_BYTES));
}
