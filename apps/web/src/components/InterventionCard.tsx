import { kindLabelFor, largeThumbnail, type Theme, themesLabel, whenLabel } from '@/lib/format';
import { useMinuteTick } from '@/lib/useMinuteTick';

import { LiveBadge } from './LiveBadge';

export interface InterventionCardData {
  id: string;
  title: string;
  outlet: string;
  kind: string | null;
  themes: Theme[];
  status: 'live' | 'upcoming' | 'past';
  date: string;
  thumbnailUrl: string | null;
}

/**
 * Image à la une en haute définition ; si elle manque, `data-fallback` ramène l'image
 * d'origine (script global de Base.astro, valable aussi sans îlot).
 */
export function CardImage({ url, className }: { url: string; className: string }) {
  const large = largeThumbnail(url);
  return (
    <img
      src={large}
      data-fallback={large === url ? undefined : url}
      alt=""
      loading="lazy"
      decoding="async"
      className={className}
    />
  );
}

/**
 * Carte d'une intervention dans les listes ; mène à l'écran de détail. Avec une image,
 * celle-ci occupe toute la largeur en tête de carte, badge « en direct » par-dessus.
 * Rendue par le serveur (accueil, recherche) ou dans un îlot (chargement continu).
 */
export function InterventionCard({ item }: { item: InterventionCardData }) {
  // Pendant un direct, la durée écoulée se met à jour chaque minute (îlot seulement).
  const now = useMinuteTick(item.status === 'live');
  const live = item.status === 'live' ? <LiveBadge /> : null;
  return (
    <a
      href={`/interventions/${item.id}`}
      className="flex h-full flex-col overflow-hidden rounded-[20px] border border-blanc/15 bg-blanc/5 transition duration-200 ease-out hover:-translate-y-0.5 hover:border-chamois/60 active:bg-blanc/10 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      {item.thumbnailUrl ? (
        <div className="relative">
          <CardImage url={item.thumbnailUrl} className="aspect-video w-full bg-bleu object-cover" />
          {live ? <div className="absolute top-3 left-3">{live}</div> : null}
        </div>
      ) : null}
      <div className="flex flex-col gap-1.5 p-4">
        {item.thumbnailUrl ? null : live}
        <p className="font-sans-semibold text-chamois text-xs uppercase tracking-wider">
          {item.outlet} · {kindLabelFor(item.status, item.kind)}
          {item.themes.length > 0 ? ` · ${themesLabel(item.themes, 2)}` : ''}
        </p>
        <h3 className="line-clamp-3 font-sans-bold text-blanc text-lg leading-snug">
          {item.title}
        </h3>
        <p className="font-sans text-blanc/70 text-sm">{whenLabel(item.status, item.date, now)}</p>
      </div>
    </a>
  );
}
