import type { Db } from '@lisnard/db/client';
import {
  listPublishedForMediaRefresh,
  listPublishedWithoutMedia,
  setMedia,
} from '@lisnard/db/write';

import { isMinimalLink, type MediaContext, resolveMedia } from './resolve';

/**
 * Calcule le rendu des contenus publiés qui n'en ont pas encore : ils deviennent alors
 * visibles. `itemId` restreint au contenu d'une notification (ADR 0023).
 */
export async function resolvePendingMedia(
  db: Db,
  ctx: MediaContext = {},
  limit = 20,
  itemId?: string,
) {
  const pending = await listPublishedWithoutMedia(db, limit, itemId);
  const counts = { embed: 0, link: 0 };
  for (const target of pending) {
    const media = await resolveMedia(target, ctx);
    await setMedia(db, target.id, media);
    counts[media.kind] += 1;
  }
  return counts;
}

/** Recalcule le rendu des contenus déjà publiés (spec « Mise à jour des rendus existants »). */
export async function refreshMedia(db: Db, ctx: MediaContext = {}, sourceId?: string) {
  const targets = await listPublishedForMediaRefresh(db, sourceId);
  const counts = { embed: 0, link: 0, publisherUrl: 0, kept: 0 };
  for (const target of targets) {
    const media = await resolveMedia(target, ctx);
    // Échec passager (Google, éditeur) : on garde le rendu existant plutôt que de le
    // remplacer par le lien minimal.
    if (isMinimalLink(media) && target.media && !isMinimalLink(target.media)) {
      counts.kept += 1;
      continue;
    }
    await setMedia(db, target.id, media);
    counts[media.kind] += 1;
    if (media.kind === 'link' && media.url) counts.publisherUrl += 1;
  }
  return { total: targets.length, ...counts };
}
