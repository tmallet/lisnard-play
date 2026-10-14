import type { Db } from '@lisnard/db/client';
import { listPublishedWithoutMedia, setMedia } from '@lisnard/db/write';

import { type MediaContext, resolveMedia } from './resolve';

/** Calcule le rendu des contenus publiés qui n'en ont pas encore : ils deviennent alors visibles. */
export async function resolvePendingMedia(db: Db, ctx: MediaContext = {}, limit = 20) {
  const pending = await listPublishedWithoutMedia(db, limit);
  const counts = { embed: 0, link: 0 };
  for (const target of pending) {
    const media = await resolveMedia(target, ctx);
    await setMedia(db, target.id, media);
    counts[media.kind] += 1;
  }
  return counts;
}
