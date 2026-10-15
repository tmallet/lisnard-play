/**
 * Reprises d'articles (spec intervention-collection, « Dédoublonnage ») : une même
 * dépêche publiée par plusieurs médias (BFM et Orange Actualités, Capital et Yahoo
 * Finance…) arrive par Google News sous des liens différents. Les articles au titre
 * identique, publiés à moins de trois jours d'écart, sont rattachés à un seul : les
 * autres sont masqués partout, sans être supprimés.
 */
import type { Db } from '@lisnard/db/client';
import { listPressItems, setDuplicateOf } from '@lisnard/db/write';

import { decodeEntities, normalize } from './text';

const WINDOW_MS = 3 * 24 * 60 * 60_000;
/**
 * Titres trop courts (« David Lisnard », « Entretien avec David Lisnard ») : deux
 * articles distincts peuvent les partager, ils ne sont jamais traités comme des reprises.
 */
const MIN_WORDS = 6;
/** Cycle courant : seuls les articles récents peuvent devenir ou avoir des reprises. */
export const RECENT_MS = 10 * 24 * 60 * 60_000;

/** Titre comparable : sans accents, casse, guillemets ni ponctuation. */
export function titleKey(title: string): string {
  return normalize(decodeEntities(title))
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

type PressItem = Awaited<ReturnType<typeof listPressItems>>[number];

/**
 * Regroupe les reprises et choisit l'article gardé : de préférence un article déjà
 * visible (pour ne rien faire disparaître), sinon le premier trouvé. Idempotent : ne
 * modifie que les rattachements qui changent. Renvoie le nombre de reprises masquées.
 */
export async function markPressDuplicates(
  db: Db,
  { since }: { since?: Date } = {},
): Promise<number> {
  const clusters: PressItem[][] = [];
  const byKey = new Map<string, PressItem[][]>();
  for (const it of await listPressItems(db, since)) {
    const key = titleKey(it.title);
    if (key.split(' ').length < MIN_WORDS) {
      // Titre générique : jamais rattaché (et libéré s'il l'avait été).
      if (it.duplicateOf) await setDuplicateOf(db, it.id, null);
      continue;
    }
    const groups = byKey.get(key) ?? [];
    const group = groups.find((g) =>
      g.some((o) => Math.abs(o.publishedAt.getTime() - it.publishedAt.getTime()) <= WINDOW_MS),
    );
    if (group) group.push(it);
    else {
      const created = [it];
      groups.push(created);
      clusters.push(created);
    }
    byKey.set(key, groups);
  }
  let duplicates = 0;
  for (const group of clusters) {
    const canonical = group.find((it) => it.visible) ?? (group[0] as PressItem);
    for (const it of group) {
      const target = it.id === canonical.id ? null : canonical.id;
      if (target) duplicates += 1;
      if (it.duplicateOf !== target) await setDuplicateOf(db, it.id, target);
    }
  }
  return duplicates;
}
