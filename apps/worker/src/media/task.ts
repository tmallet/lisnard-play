import type { Db } from '@lisnard/db/client';
import {
  listPublishedForMediaRefresh,
  listPublishedWithoutMedia,
  setMedia,
} from '@lisnard/db/write';

import { decodeEntities, hasEntities } from '../text';
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

/**
 * Répare, sans appel réseau, les aperçus enregistrés avant le décodage complet des
 * entités HTML (« Actualit&eacute;s » → « Actualités ») : titre, site et description
 * Open Graph. Idempotent ; ne touche que les rendus qui contiennent encore une entité.
 */
export async function repairMediaEntities(db: Db): Promise<number> {
  let repaired = 0;
  for (const target of await listPublishedForMediaRefresh(db)) {
    const media = target.media;
    if (media?.kind !== 'link') continue;
    const og = Object.fromEntries(
      Object.entries(media.og).map(([key, value]) => [key, value ? decodeEntities(value) : value]),
    ) as typeof media.og;
    if (!Object.values(media.og).some((v) => v && hasEntities(v))) continue;
    await setMedia(db, target.id, { ...media, og });
    repaired += 1;
  }
  return repaired;
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
