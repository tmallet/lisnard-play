/**
 * Aperçu du lien d'un récapitulatif (spec campaign-recaps, ADR 0031) : en-tête de
 * `/campagne?jour=…` ou `?semaine=…` réécrit par server.ts, et image du récapitulatif,
 * comme pour les citations (ADR 0029, 0030). Le récapitulatif est lu par l'API interne.
 */
import { pageTitle } from '../config/app';
import {
  periodLabel,
  type RecapPeriod,
  recapDescription,
  recapImagePath,
  recapPath,
  recapSummary,
  recapTitle,
} from '../lib/recap';
import { fingerprint, type PageMeta, previewMeta } from './quote-page';
import { type Api, callQuery } from './quote-share';
import type { RecapCardData } from './recap-card';

/** Récapitulatif renvoyé par `recap.get` (champs utiles ici). */
export interface RecapAt {
  period: RecapPeriod;
  from: string;
  to: string;
  interventions: unknown[];
  outlets: { name: string; official: boolean; count: number }[];
  places: { label: string; lat: number; lon: number }[];
  quote: { text: string; outlet: string; official: boolean } | null;
  members: { total: number; delta: number; curve: { day: string; members: number }[] } | null;
}

export interface RecapParams {
  period: RecapPeriod;
  start: string;
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Récapitulatif demandé par l'adresse de la page Campagne, sinon null. */
export function recapPageParams(url: URL): RecapParams | null {
  if (url.pathname !== '/campagne') return null;
  const day = url.searchParams.get('jour');
  const week = url.searchParams.get('semaine');
  if (day && DAY.test(day)) return { period: 'day', start: day };
  if (week && DAY.test(week)) return { period: 'week', start: week };
  return null;
}

const IMAGE = /^\/campagne\/recap\/(jour|semaine)\/(\d{4}-\d{2}-\d{2})\.png$/;

export function recapImageParams(pathname: string): RecapParams | null {
  const match = IMAGE.exec(pathname);
  if (!match?.[1] || !match[2]) return null;
  return { period: match[1] === 'jour' ? 'day' : 'week', start: match[2] };
}

export const readRecap = (api: Api, req: Request, p: RecapParams) =>
  callQuery<RecapAt>(api, req, 'recap.get', p);

/** Contenu qui change l'image : un récapitulatif qui évolue (jour en cours) change d'adresse. */
const recapVersion = (r: RecapAt) =>
  fingerprint(
    JSON.stringify([r.interventions.length, r.members?.total ?? null, r.quote?.text ?? null]),
  );

export function recapPageMeta(r: RecapAt, origin: string): PageMeta {
  const label = periodLabel(r.period, r.from, r.to);
  const summary = recapSummary(r.interventions.length, r.members?.delta ?? null);
  return previewMeta({
    url: `${origin}${recapPath(r.period, r.from)}`,
    image: `${origin}${recapImagePath(r.period, r.from)}?v=${recapVersion(r)}`,
    title: pageTitle(`${recapTitle(r.period)}, ${label}`),
    description: recapDescription(
      r.interventions.length,
      r.members?.delta ?? null,
      r.quote?.text ?? null,
    ),
    alt: `${recapTitle(r.period)}, ${label} : ${summary}`,
  });
}

export const recapCardData = (r: RecapAt, host: string): RecapCardData => ({
  period: r.period,
  from: r.from,
  to: r.to,
  count: r.interventions.length,
  outlets: r.outlets,
  places: r.places,
  members: r.members,
  quote: r.quote,
  host,
});

type Render = (data: RecapCardData) => Promise<Uint8Array>;
const MAX_CACHED = 100;

/** Image d'un récapitulatif : 404 sans intervention, 503 si l'API échoue ; cache borné. */
export function createRecapImageHandler(api: Api, render: () => Promise<Render>) {
  const cache = new Map<string, Promise<Uint8Array>>();
  return async (req: Request, params: RecapParams, host: string) => {
    const recap = await readRecap(api, req, params);
    if (recap === 'error') return new Response('Image indisponible', { status: 503 });
    if (!recap) return new Response('Récapitulatif introuvable', { status: 404 });
    const key = `${params.period}:${params.start}:${recapVersion(recap)}`;
    let pending = cache.get(key);
    if (!pending) {
      pending = render().then((draw) => draw(recapCardData(recap, host)));
      if (cache.size >= MAX_CACHED) cache.delete(cache.keys().next().value as string);
      cache.set(key, pending);
      pending.catch(() => cache.delete(key));
    }
    const png = await pending;
    // Un jour en cours évolue : cache court ; l'adresse versionnée suffit aux aperçus.
    return new Response(png as Uint8Array<ArrayBuffer>, {
      headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=600' },
    });
  };
}
