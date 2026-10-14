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
  title: string;
  description: string;
  publishedAt: Date | null;
  thumbnailUrl: string | null;
  liveStatus: 'none' | 'upcoming' | 'live' | 'ended';
  startsAt: Date | null;
  endsAt: Date | null;
  /** Durée en secondes ; null pour un direct à venir ou en cours (« P0D »). */
  durationS: number | null;
}

interface ApiVideo {
  id: string;
  snippet?: {
    title?: string;
    description?: string;
    publishedAt?: string;
    liveBroadcastContent?: string;
    thumbnails?: Record<string, { url?: string } | undefined>;
  };
  contentDetails?: { duration?: string };
  liveStreamingDetails?: {
    scheduledStartTime?: string;
    actualStartTime?: string;
    actualEndTime?: string;
  };
}

const toDate = (value?: string) => (value ? new Date(value) : null);

/** Durée ISO 8601 de l'API (« PT1H2M3S », « P1DT2H ») en secondes ; null si absente ou nulle. */
export function parseIsoDuration(value?: string): number | null {
  const m = value?.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/);
  if (!m) return null;
  const [d, h, min, sec] = m.slice(1).map((x) => Number(x ?? 0)) as [
    number,
    number,
    number,
    number,
  ];
  const total = ((d * 24 + h) * 60 + min) * 60 + sec;
  return total > 0 ? total : null;
}

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
  const thumbs = v.snippet?.thumbnails ?? {};
  return {
    title: v.snippet?.title ?? '',
    description: v.snippet?.description ?? '',
    publishedAt: toDate(v.snippet?.publishedAt),
    thumbnailUrl: thumbs.high?.url ?? thumbs.medium?.url ?? thumbs.default?.url ?? null,
    liveStatus,
    startsAt: toDate(live?.actualStartTime ?? live?.scheduledStartTime),
    endsAt: toDate(live?.actualEndTime),
    durationS: parseIsoDuration(v.contentDetails?.duration),
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
    const url = `${VIDEOS_URL}?part=snippet,liveStreamingDetails,contentDetails&id=${batch.join(',')}&key=${ctx.youtubeApiKey}`;
    const res = await ctx.fetch(url);
    ctx.quota.youtubeUnits += 1;
    if (!res.ok) throw new Error(`videos.list : HTTP ${res.status}`);
    const body = (await res.json()) as { items?: ApiVideo[] };
    for (const v of body.items ?? []) result.set(v.id, toVideoDetails(v));
  }
  return result;
}

/** Enrichit des entrées (flux RSS ou playlist) par videos.list et en fait des candidats. */
async function toCandidates(entries: FeedEntry[], ctx: SourceContext): Promise<Candidate[]> {
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
      durationS: d?.durationS ?? null,
    };
  });
}

/** Collecte courante d'une chaîne : flux RSS (15 dernières vidéos), puis enrichissement. */
export async function collectYoutube(
  source: YoutubeSourceConfig,
  ctx: SourceContext,
): Promise<Candidate[]> {
  const res = await ctx.fetch(FEED_URL + source.channelId);
  if (!res.ok) throw new Error(`flux YouTube ${source.channelId} : HTTP ${res.status}`);
  return toCandidates(parseChannelFeed(await res.text()), ctx);
}

const PLAYLIST_ITEMS_URL = 'https://www.googleapis.com/youtube/v3/playlistItems';

interface PlaylistItem {
  snippet?: {
    title?: string;
    description?: string;
    thumbnails?: Record<string, { url?: string } | undefined>;
  };
  contentDetails?: { videoId?: string; videoPublishedAt?: string };
}

/**
 * Toutes les vidéos d'une chaîne publiées depuis `since`, via sa playlist « uploads »
 * (1 unité de quota par page de 50, ADR 0018). La playlist est triée de la plus récente
 * à la plus ancienne : le parcours s'arrête à la première vidéo antérieure à `since`.
 */
export async function listUploadsSince(
  channelId: string,
  since: Date,
  ctx: SourceContext,
): Promise<FeedEntry[]> {
  if (!ctx.youtubeApiKey) throw new Error('YOUTUBE_API_KEY manquante');
  const playlistId = `UU${channelId.slice(2)}`;
  const entries: FeedEntry[] = [];
  let pageToken = '';
  do {
    const url = `${PLAYLIST_ITEMS_URL}?part=snippet,contentDetails&maxResults=50&playlistId=${playlistId}&key=${ctx.youtubeApiKey}${pageToken ? `&pageToken=${pageToken}` : ''}`;
    const res = await ctx.fetch(url);
    ctx.quota.youtubeUnits += 1;
    if (!res.ok) throw new Error(`playlistItems.list : HTTP ${res.status}`);
    const body = (await res.json()) as { items?: PlaylistItem[]; nextPageToken?: string };
    for (const it of body.items ?? []) {
      const videoId = it.contentDetails?.videoId;
      const published = new Date(it.contentDetails?.videoPublishedAt ?? '');
      // Vidéos privées ou supprimées : pas de date de publication.
      if (!videoId || Number.isNaN(published.getTime())) continue;
      if (published < since) return entries;
      const thumbs = it.snippet?.thumbnails ?? {};
      entries.push({
        videoId,
        title: it.snippet?.title ?? '',
        description: it.snippet?.description ?? '',
        publishedAt: published,
        thumbnailUrl: thumbs.high?.url ?? thumbs.medium?.url ?? thumbs.default?.url ?? null,
      });
    }
    pageToken = body.nextPageToken ?? '';
  } while (pageToken);
  return entries;
}

/** Rattrapage complet d'une chaîne depuis `since` (ADR 0018). */
export async function backfillYoutube(
  source: YoutubeSourceConfig,
  since: Date,
  ctx: SourceContext,
): Promise<Candidate[]> {
  return toCandidates(await listUploadsSince(source.channelId, since, ctx), ctx);
}

/** Candidat construit à partir de videos.list seul (notification push, ADR 0023). */
export function candidateFromDetails(videoId: string, d: VideoDetails): Candidate | null {
  if (!d.publishedAt) return null;
  return {
    platformId: `yt:${videoId}`,
    url: `https://www.youtube.com/watch?v=${videoId}`,
    title: d.title,
    description: d.description,
    publishedAt: d.publishedAt,
    startsAt: d.startsAt,
    endsAt: d.endsAt,
    liveStatus: d.liveStatus,
    thumbnailUrl: d.thumbnailUrl,
    durationS: d.durationS,
  };
}

const TOPIC_URL = 'https://www.youtube.com/xml/feeds/videos.xml?channel_id=';

/** Sujet WebSub d'une chaîne (distinct de l'URL du flux RSS lu par la collecte). */
export const channelTopic = (channelId: string) => TOPIC_URL + channelId;

/** Identifiant de chaîne d'un sujet WebSub ; null si l'URL n'est pas un flux de chaîne. */
export function channelOfTopic(topic: string): string | null {
  try {
    const url = new URL(topic);
    if (url.hostname !== 'www.youtube.com' || url.pathname !== '/xml/feeds/videos.xml') return null;
    return url.searchParams.get('channel_id');
  } catch {
    return null;
  }
}

export interface PushNotification {
  /** Vidéos créées ou modifiées. */
  videos: { videoId: string; channelId: string }[];
  /** Vidéos supprimées (`at:deleted-entry`). */
  deleted: { videoId: string; channelId: string | null }[];
}

/** Analyse le corps Atom d'une notification push YouTube (ADR 0023). */
export function parseNotification(body: string): PushNotification {
  const doc = xml.parse(body) as { feed?: Record<string, unknown> };
  const feed = doc.feed ?? {};
  const videos = asArray(feed.entry as Record<string, unknown>[] | undefined).flatMap((e) => {
    const videoId = text(e['yt:videoId']);
    const channelId = text(e['yt:channelId']);
    return videoId && channelId ? [{ videoId, channelId }] : [];
  });
  const deleted = asArray(
    feed['at:deleted-entry'] as Record<string, unknown>[] | undefined,
  ).flatMap((e) => {
    const videoId = String(e['@ref'] ?? '').replace(/^yt:video:/, '');
    const by = (e['at:by'] ?? {}) as Record<string, unknown>;
    const channelId = text(by.uri).match(/\/channel\/([\w-]+)/)?.[1] ?? null;
    return videoId ? [{ videoId, channelId }] : [];
  });
  return { videos, deleted };
}
