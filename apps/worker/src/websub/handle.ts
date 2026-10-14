/**
 * Voie rapide d'une notification (ADR 0023, design D3) : la vidéo est enregistrée,
 * classée et dotée de son rendu sans attendre les cycles de la boucle.
 */
import type { Db } from '@lisnard/db/client';
import { closeVanished, upsertItem } from '@lisnard/db/write';

import type { Classifier } from '../classifier/types';
import { keepCandidate } from '../collect';
import type { MediaContext } from '../media/resolve';
import { resolvePendingMedia } from '../media/task';
import { classifyPending } from '../publish';
import type { SourceConfig, SourceContext, YoutubeSourceConfig } from '../sources/types';
import { candidateFromDetails, fetchVideoDetails, type PushNotification } from '../sources/youtube';

export interface PushDeps {
  db: Db;
  ctx: SourceContext;
  classifier: Classifier;
  sources: SourceConfig[];
  media?: MediaContext;
}

export interface PushStats {
  notified: number;
  kept: number;
  published: number;
  closed: number;
}

export async function handleNotification(
  { db, ctx, classifier, sources, media = {} }: PushDeps,
  n: PushNotification,
): Promise<PushStats> {
  const stats: PushStats = { notified: n.videos.length, kept: 0, published: 0, closed: 0 };
  const sourceOf = (channelId: string) =>
    sources.find(
      (s): s is YoutubeSourceConfig =>
        s.kind === 'youtube' && s.active && s.channelId === channelId,
    );

  for (const d of n.deleted) {
    await closeVanished(db, `yt:${d.videoId}`);
    stats.closed += 1;
  }

  const videos = n.videos.filter((v) => sourceOf(v.channelId));
  if (videos.length === 0) return stats;
  const details = await fetchVideoDetails(
    videos.map((v) => v.videoId),
    ctx,
  );
  for (const v of videos) {
    const source = sourceOf(v.channelId) as YoutubeSourceConfig;
    const d = details.get(v.videoId);
    const candidate = d ? candidateFromDetails(v.videoId, d) : null;
    // Absente de l'API : vidéo privée ou retirée entre-temps.
    if (!candidate) {
      await closeVanished(db, `yt:${v.videoId}`);
      continue;
    }
    if (!keepCandidate(source, candidate)) continue;
    const { id } = await upsertItem(db, { ...candidate, sourceId: source.id });
    stats.kept += 1;
    const classified = await classifyPending(db, classifier, { itemId: id, limit: 1 });
    if (classified.published > 0) stats.published += 1;
    // Rendu du lecteur : seulement si le contenu est publié et n'en a pas encore.
    await resolvePendingMedia(db, media, 1, id);
  }
  return stats;
}
