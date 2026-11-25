/**
 * Cache des images de partage (ADR 0029, 0031) : mémoire bornée, indexée par le contenu
 * (une citation régénérée ou un jour qui évolue changent de clé). Sans satori : les tests
 * et les routes le chargent sans le moteur de rendu.
 */
const MAX_CACHED = 200;
const cache = new Map<string, Promise<Uint8Array>>();

/** Image mise en cache par sa clé de contenu ; une image en cours est partagée. */
export function cachedImage(key: string, render: () => Promise<Uint8Array>): Promise<Uint8Array> {
  let pending = cache.get(key);
  if (!pending) {
    pending = render();
    if (cache.size >= MAX_CACHED) cache.delete(cache.keys().next().value as string);
    cache.set(key, pending);
    // Échec : rien n'est gardé, la requête suivante réessaie.
    pending.catch(() => cache.delete(key));
  }
  return pending;
}

/** Réponse PNG, ou 503 journalisé : une image en échec ne fait jamais tomber la page. */
export async function pngResponse(
  what: string,
  image: () => Promise<Uint8Array>,
  maxAge: number,
): Promise<Response> {
  try {
    return new Response((await image()) as Uint8Array<ArrayBuffer>, {
      headers: { 'Content-Type': 'image/png', 'Cache-Control': `public, max-age=${maxAge}` },
    });
  } catch (error) {
    console.error(JSON.stringify({ msg: `${what} en échec`, error: String(error) }));
    return new Response('Image indisponible', { status: 503 });
  }
}
