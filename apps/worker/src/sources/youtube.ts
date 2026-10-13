/**
 * Source YouTube (ADR 0017) : découverte par le flux RSS public de la chaîne
 * (sans quota), puis enrichissement par videos.list (1 unité par lot de 50).
 */
import { XMLParser } from 'fast-xml-parser';

import { decodeEntities } from '../text';
import type { Candidate, SourceContext, YoutubeSourceConfig } from './types';

const FEED_URL = 'https://www.youtube.com/feeds/videos.xml?channel_id=';
const VIDEOS_URL = 'https://www.googleapis.com/youtube/v3/videos';
const BATCH = 50;

const xml = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@',
  processEntities: false,
});

interface FeedEntry {
  videoId: string;
  title: string;
  description: string;
  publishedAt: Date;
  thumbnailUrl: string | null;
}

function asArray<T>(value: T | T[] | undefined): T[] {
  return value === undefined ? [] : Array.isArray(value) ? value : [value];
}

function text(value: unknown): string {
  if (typeof value === 'string') return decodeEntities(value);
  if (typeof value === 'number') return String(value);
  if (value && typeof value === 'object' && '#text' in value)
    return text((value as { '#text': unknown })['#text']);
  return '';
}

/** Analyse le flux Atom d'une chaîne (15 dernières vidéos). */
export function parseChannelFeed(body: string): FeedEntry[] {
  const doc = xml.parse(body) as { feed?: { entry?: unknown } };
  return asArray(
    doc.feed?.entry as Record<string, unknown>[] | Record<string, unknown> | undefined,
  ).flatMap((e) => {
    const videoId = text(e['yt:videoId']);
    const published = new Date(text(e.published));
    if (!videoId || Number.isNaN(published.getTime())) return [];
    const group = (e['media:group'] ?? {}) as Record<string, unknown>;
    const thumb = group['media:thumbnail'] as { '@url'?: string } | undefined;
    return [
      {
        videoId,
        title: text(e.title),
        description: text(group['media:description']),
        publishedAt: published,
        thumbnailUrl: thumb?.['@url'] ?? null,
      },
    ];
  });
}

export interface VideoDetails {
  description: string;
  liveStatus: 'none' | 'upcoming' | 'live' | 'ended';
  startsAt: Date | null;
  endsAt: Date | null;
}

interface ApiVideo {
  id: string;
  snippet?: { description?: string; liveBroadcastContent?: string };
  liveStreamingDetails?: {
    scheduledStartTime?: string;
    actualStartTime?: string;
    actualEndTime?: string;
  };
}

const toDate = (value?: string) => (value ? new Date(value) : null);

/** Statut de diffusion à partir des métadonnées de la plateforme (spec intervention-collection). */
export function toVideoDetails(v: ApiVideo): VideoDetails {
  const live = v.liveStreamingDetails;
  const broadcast = v.snippet?.liveBroadcastContent;
  const liveStatus =
    broadcast === 'live'
      ? 'live'
      : broadcast === 'upcoming'
        ? 'upcoming'
        : live?.actualEndTime
          ? 'ended'
          : 'none';
  return {
    description: v.snippet?.description ?? '',
    liveStatus,
    startsAt: toDate(live?.actualStartTime ?? live?.scheduledStartTime),
    endsAt: toDate(live?.actualEndTime),
  };
}

/** videos.list par lots de 50 identifiants ; 1 unité de quota par appel. */
export async function fetchVideoDetails(
  ids: string[],
  ctx: SourceContext,
): Promise<Map<string, VideoDetails>> {
  const result = new Map<string, VideoDetails>();
  if (!ctx.youtubeApiKey) throw new Error('YOUTUBE_API_KEY manquante');
  for (let i = 0; i < ids.length; i += BATCH) {
    const batch = ids.slice(i, i + BATCH);
    const url = `${VIDEOS_URL}?part=snippet,liveStreamingDetails&id=${batch.join(',')}&key=${ctx.youtubeApiKey}`;
    const res = await ctx.fetch(url);
    ctx.quota.youtubeUnits += 1;
    if (!res.ok) throw new Error(`videos.list : HTTP ${res.status}`);
    const body = (await res.json()) as { items?: ApiVideo[] };
    for (const v of body.items ?? []) result.set(v.id, toVideoDetails(v));
  }
  return result;
}

/** Collecte une chaîne : flux RSS, puis enrichissement des vidéos. */
export async function collectYoutube(
  source: YoutubeSourceConfig,
  ctx: SourceContext,
): Promise<Candidate[]> {
  const res = await ctx.fetch(FEED_URL + source.channelId);
  if (!res.ok) throw new Error(`flux YouTube ${source.channelId} : HTTP ${res.status}`);
  const entries = parseChannelFeed(await res.text());
  const details = await fetchVideoDetails(
    entries.map((e) => e.videoId),
    ctx,
  );
  return entries.map((e) => {
    const d = details.get(e.videoId);
    return {
      platformId: `yt:${e.videoId}`,
      url: `https://www.youtube.com/watch?v=${e.videoId}`,
      title: e.title,
      // La description de l'API est complète ; celle du flux sert de repli.
      description: d?.description || e.description,
      publishedAt: e.publishedAt,
      startsAt: d?.startsAt ?? null,
      endsAt: d?.endsAt ?? null,
      liveStatus: d?.liveStatus ?? 'none',
      thumbnailUrl: e.thumbnailUrl,
    };
  });
}
