/**
 * Images d'une citation (spec intervention-quotes, ADR 0029 et 0030) : carré
 * (`image.png`, « Partager en image ») et paysage (`apercu.png`, aperçus de lien).
 */
import type { APIContext } from 'astro';

import { api } from './api';
import { cachedImage, pngResponse, renderQuoteImage } from './images';
import type { CardFormat } from './quote-card';
import { siteUrl } from './site';

export async function quoteImage(context: APIContext, format: CardFormat): Promise<Response> {
  const id = context.params.id ?? '';
  const raw = context.params.t ?? '';
  if (!/^\d{1,5}$/.test(raw)) return new Response('Citation introuvable', { status: 404 });
  let quote: Awaited<ReturnType<ReturnType<typeof api>['quotes']['at']>>;
  try {
    quote = await api(context.request).quotes.at({ id, t: Number(raw) });
  } catch {
    // Base indisponible : 503, pour ne pas faire croire que la citation a disparu.
    return new Response('Image indisponible', { status: 503 });
  }
  if (!quote) return new Response('Citation introuvable', { status: 404 });
  const found = quote;
  // Adresse du site en pied d'image : celle de la production, jamais celle de la requête.
  const host = siteUrl().host;
  const key = JSON.stringify(['quote', found.itemId, found.startS, found.text, format, host]);
  return pngResponse(
    'image de citation',
    () => cachedImage(key, () => renderQuoteImage({ ...found, host }, format)),
    86_400,
  );
}
