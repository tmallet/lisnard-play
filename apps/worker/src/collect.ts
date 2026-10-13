/**
 * Collecte (spec intervention-collection) : interroge les sources, applique le
 * pré-filtre et le seuil d'historique, puis enregistre les candidats (dédoublonnés).
 */
import type { Db } from '@lisnard/db/client';
import { listLiveToRecheck, updateLiveStatus, upsertItem } from '@lisnard/db/write';

import { HISTORY_START } from './config';
import { errorMessage, log } from './log';
import { collectRss } from './sources/rss';
import type { Candidate, SourceConfig, SourceContext } from './sources/types';
import { collectYoutube, fetchVideoDetails } from './sources/youtube';
import { mentionsLisnard } from './text';

export interface CollectStats {
  sources: number;
  failed: string[];
  fetched: number;
  kept: number;
  inserted: number;
}

/** Garde un candidat s'il mentionne David Lisnard (sauf chaîne officielle) et n'est pas antérieur à l'historique. */
export function keepCandidate(source: SourceConfig, c: Candidate): boolean {
  const official = source.kind === 'youtube' && source.official === true;
  if (!official && !mentionsLisnard(c.title, c.description)) return false;
  const date = c.startsAt ?? c.publishedAt;
  return date >= HISTORY_START;
}

function collectFrom(source: SourceConfig, ctx: SourceContext): Promise<Candidate[]> {
  return source.kind === 'youtube' ? collectYoutube(source, ctx) : collectRss(source, ctx);
}

/** Collecte les sources actives données ; la panne d'une source n'arrête pas les autres. */
export async function runCollection(
  db: Db,
  sources: SourceConfig[],
  ctx: SourceContext,
): Promise<CollectStats> {
  const stats: CollectStats = { sources: 0, failed: [], fetched: 0, kept: 0, inserted: 0 };
  for (const source of sources.filter((s) => s.active)) {
    stats.sources += 1;
    try {
      const candidates = await collectFrom(source, ctx);
      stats.fetched += candidates.length;
      for (const c of candidates.filter((c) => keepCandidate(source, c))) {
        const { inserted } = await upsertItem(db, { ...c, sourceId: source.id });
        stats.kept += 1;
        if (inserted) stats.inserted += 1;
      }
    } catch (error) {
      stats.failed.push(source.id);
      log.error('collecte : source en échec', { source: source.id, error: errorMessage(error) });
    }
  }
  return stats;
}

/** Revérifie les directs programmés ou en cours jusqu'à leur fin (spec intervention-collection). */
export async function recheckLive(db: Db, ctx: SourceContext): Promise<number> {
  const pending = await listLiveToRecheck(db);
  const ids = pending
    .filter((p) => p.platformId.startsWith('yt:'))
    .map((p) => p.platformId.slice(3));
  if (ids.length === 0) return 0;
  const details = await fetchVideoDetails(ids, ctx);
  for (const [id, d] of details) {
    await updateLiveStatus(db, `yt:${id}`, {
      liveStatus: d.liveStatus,
      startsAt: d.startsAt,
      endsAt: d.endsAt,
    });
  }
  return details.size;
}
