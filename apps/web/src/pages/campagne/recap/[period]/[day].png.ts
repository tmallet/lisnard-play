import type { APIRoute } from 'astro';
import { api } from '@/server/api';
import { cachedImage, pngResponse, renderRecapImage } from '@/server/images';
import { recapCardData, recapVersion } from '@/server/recap';
import { siteUrl } from '@/server/site';

/**
 * Image d'un récapitulatif (ADR 0031) : `/campagne/recap/jour/AAAA-MM-JJ.png` ou
 * `…/semaine/…`. 404 sans intervention, 503 si l'API échoue.
 */
export const GET: APIRoute = async ({ params, request }) => {
  const period = params.period === 'jour' ? 'day' : params.period === 'semaine' ? 'week' : null;
  const start = params.day ?? '';
  if (!period || !/^\d{4}-\d{2}-\d{2}$/.test(start))
    return new Response('Récapitulatif introuvable', { status: 404 });
  let recap: Awaited<ReturnType<ReturnType<typeof api>['recap']['get']>>;
  try {
    recap = await api(request).recap.get({ period, start });
  } catch {
    return new Response('Image indisponible', { status: 503 });
  }
  if (!recap) return new Response('Récapitulatif introuvable', { status: 404 });
  const found = recap;
  const host = siteUrl().host;
  const key = `recap:${period}:${start}:${recapVersion(found)}:${host}`;
  // Un jour en cours évolue : cache court ; l'adresse versionnée suffit aux aperçus.
  return pngResponse(
    'image de récapitulatif',
    () => cachedImage(key, () => renderRecapImage(recapCardData(found, host))),
    600,
  );
};
