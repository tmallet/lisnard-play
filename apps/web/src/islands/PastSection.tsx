import { useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import { InterventionCard, type InterventionCardData } from '@/components/InterventionCard';
import { JoinBar, JoinCta } from '@/components/Join';
import { SectionTitle } from '@/components/SectionTitle';
import type { Format } from '@/lib/filters';
import type { Theme } from '@/lib/format';
import { ApiProvider, useTRPC } from '@/lib/trpc';

interface Props {
  theme: Theme | null;
  format: Format | null;
  /** Première page, lue par le serveur (curseur `avant` de l'adresse compris). */
  items: InterventionCardData[];
  nextCursor: string | null;
  /** Curseur de la page servie (adresse `?avant=`), null pour la première. */
  cursor: string | null;
  /** Liens sans JavaScript : page suivante et retour aux plus récentes. */
  olderHref: string | null;
  newestHref: string | null;
  /** La lecture serveur a échoué. */
  failed: boolean;
}

/**
 * Encart d'adhésion après la première rangée de cartes : deux cartes dès 768 px, trois
 * dès 1024 px. Sur téléphone, le bandeau fin au-dessus des cartes suffit.
 */
const JOIN_AFTER = [
  { after: 2, className: 'hidden md:block lg:hidden' },
  { after: 3, className: 'hidden lg:block' },
] as const;

/** Distance au bas de la liste à partir de laquelle la page suivante est demandée. */
const MARGIN = '800px';

function emptyMessage(theme: Theme | null, format: Format | null) {
  if (format) return 'Aucune intervention ne correspond à ces filtres pour l’instant.';
  if (theme) return 'Aucune intervention ne correspond à ce thème pour l’instant.';
  return 'Les interventions de David Lisnard apparaîtront ici.';
}

function Past(props: Props) {
  const { theme, format } = props;
  const trpc = useTRPC();
  const past = useInfiniteQuery(
    trpc.interventions.list.infiniteQueryOptions(
      { status: 'past', theme: theme ?? undefined, format: format ?? undefined, limit: 20 },
      {
        getNextPageParam: (last) => last.nextCursor ?? undefined,
        initialCursor: props.cursor,
        initialData: props.failed
          ? undefined
          : {
              pages: [{ items: props.items, nextCursor: props.nextCursor }],
              pageParams: [props.cursor],
            },
        staleTime: Number.POSITIVE_INFINITY,
        refetchOnWindowFocus: false,
      },
    ),
  );
  // Après l'hydratation seulement : le lien « plus anciennes » laisse place au chargement
  // continu. Le premier rendu reste identique au HTML du serveur.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  // Chargement continu : la page suivante arrive à l'approche du bas de la liste. Après
  // un échec, on attend un geste explicite (bouton « Réessayer »).
  const sentinel = useRef<HTMLDivElement>(null);
  const latest = useRef(past);
  latest.current = past;
  useEffect(() => {
    const node = sentinel.current;
    if (!hydrated || !node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const p = latest.current;
        if (
          entries.some((e) => e.isIntersecting) &&
          p.hasNextPage &&
          !p.isFetchingNextPage &&
          !p.isFetchNextPageError
        )
          void p.fetchNextPage({ cancelRefetch: false });
      },
      { rootMargin: `0px 0px ${MARGIN} 0px` },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hydrated]);

  const items = past.data?.pages.flatMap((p) => p.items) ?? [];
  const failed = past.isError && !past.data;
  const pending = props.failed && past.isPending;
  return (
    <section className="flex flex-col gap-3">
      <SectionTitle>Passées</SectionTitle>
      {pending || failed ? null : (
        <p aria-live="polite" className="font-sans text-blanc/70 text-sm">
          {items.length}
          {past.hasNextPage ? '+' : ''} intervention{items.length > 1 ? 's' : ''}
        </p>
      )}
      <div className="md:hidden">
        <JoinBar />
      </div>
      {pending || failed ? null : items.length === 0 ? (
        <p className="font-sans text-base text-blanc/85">{emptyMessage(theme, format)}</p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {items.flatMap((item, index) => [
            <li key={item.id}>
              <InterventionCard item={item} />
            </li>,
            ...JOIN_AFTER.filter((r) => index === Math.min(r.after, items.length) - 1).map((r) => (
              <li key={`join-${r.after}`} className={`col-span-full ${r.className}`}>
                <JoinCta compact />
              </li>
            )),
          ])}
        </ul>
      )}
      {failed || (past.isFetchNextPageError && !past.isFetchingNextPage) ? (
        <button
          type="button"
          onClick={() => (failed ? past.refetch() : past.fetchNextPage({ cancelRefetch: false }))}
          className="self-center rounded-full border border-chamois px-5 py-2 font-sans-semibold text-chamois"
        >
          Chargement impossible. Réessayer
        </button>
      ) : null}
      {pending || past.isFetchingNextPage ? (
        <p aria-live="polite" className="self-center font-sans text-blanc/70">
          Chargement…
        </p>
      ) : null}
      {hydrated ? (
        <div ref={sentinel} aria-hidden="true" />
      ) : (
        <nav
          aria-label="Pages des interventions passées"
          className="flex flex-wrap justify-center gap-x-6 gap-y-2"
        >
          {props.newestHref ? (
            <a href={props.newestHref} className="font-sans-semibold text-chamois underline">
              ‹ Interventions les plus récentes
            </a>
          ) : null}
          {props.olderHref ? (
            <a href={props.olderHref} className="font-sans-semibold text-chamois underline">
              Interventions plus anciennes ›
            </a>
          ) : null}
        </nav>
      )}
    </section>
  );
}

/**
 * Section « Passées » de l'accueil : première page rendue par le serveur, avec des liens
 * de pagination lisibles sans JavaScript ; une fois hydratée, chargement continu
 * (spec intervention-feed, ADR 0037).
 */
export default function PastSection(props: Props) {
  return (
    <ApiProvider>
      <Past {...props} />
    </ApiProvider>
  );
}
