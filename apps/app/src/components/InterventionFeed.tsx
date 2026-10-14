import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useTRPC } from '@/lib/trpc';

import { CardGrid } from './CardGrid';
import { InterventionCard, type InterventionCardData } from './InterventionCard';
import { JoinCta } from './JoinCta';
import { NotifyInvite } from './NotifyInvite';
import { useOnEndReached } from './ScrollEnd';
import { ThemeFilter, type ThemeFilterValue } from './ThemeFilter';

/**
 * Rafraîchissement des directs et des interventions à venir (spec intervention-feed),
 * en plus du retour au premier plan (lib/focus.ts).
 */
const REFRESH_MS = 30_000;

function SectionTitle({ children, live = false }: { children: string; live?: boolean }) {
  return (
    <Text
      role="heading"
      aria-level={2}
      className={`font-sans-extrabold text-xl uppercase tracking-wide ${live ? 'text-emeraude' : 'text-blanc'}`}
    >
      {children}
    </Text>
  );
}

function Section({
  title,
  items,
  live,
}: {
  title: string;
  items: InterventionCardData[];
  live?: boolean;
}) {
  return (
    <View className="gap-3">
      <SectionTitle live={live}>{title}</SectionTitle>
      <CardGrid>
        {items.map((item) => (
          <InterventionCard key={item.id} item={item} />
        ))}
      </CardGrid>
    </View>
  );
}

/** Accueil : « En direct », « À venir », « Passées », filtrables par thème. */
export function InterventionFeed() {
  const trpc = useTRPC();
  const [themeFilter, setThemeFilter] = useState<ThemeFilterValue>('all');
  const theme = themeFilter === 'all' ? undefined : themeFilter;

  const live = useQuery(
    trpc.interventions.list.queryOptions(
      { status: 'live', theme },
      { refetchInterval: REFRESH_MS },
    ),
  );
  const upcoming = useQuery(
    trpc.interventions.list.queryOptions(
      { status: 'upcoming', theme },
      { refetchInterval: REFRESH_MS },
    ),
  );
  const past = useInfiniteQuery(
    trpc.interventions.list.infiniteQueryOptions(
      { status: 'past', theme, limit: 20 },
      {
        getNextPageParam: (last) => last.nextCursor ?? undefined,
        // Au retour au premier plan, seules les sections « En direct » et « À venir » se
        // rafraîchissent : relire toutes les pages chargées des passées serait inutile.
        refetchOnWindowFocus: false,
      },
    ),
  );

  // Chargement continu : la page suivante arrive à l'approche du bas de l'écran. L'appel
  // est répété à chaque défilement : sans cancelRefetch: false, chaque appel annulerait
  // et relancerait la requête en cours. Après un échec, on attend un geste explicite.
  useOnEndReached(() => {
    if (past.hasNextPage && !past.isFetchingNextPage && !past.isFetchNextPageError)
      void past.fetchNextPage({ cancelRefetch: false });
  });

  const liveItems = live.data?.items ?? [];
  const upcomingItems = upcoming.data?.items ?? [];
  const pastItems = past.data?.pages.flatMap((p) => p.items) ?? [];
  const loading = live.isPending || upcoming.isPending || past.isPending;
  // Échec seulement si une section n'a aucune donnée : un rafraîchissement ou une page
  // suivante en échec n'efface pas ce qui est déjà affiché.
  const failed =
    (live.isError && !live.data) ||
    (upcoming.isError && !upcoming.data) ||
    (past.isError && !past.data);

  return (
    <View className="gap-8">
      <ThemeFilter value={themeFilter} onChange={setThemeFilter} />
      {failed ? (
        <Text className="font-sans text-base text-blanc/85">
          Les interventions n’ont pas pu être chargées. Réessayez dans un instant.
        </Text>
      ) : loading ? (
        <Text className="font-sans text-base text-blanc/70">Chargement des interventions…</Text>
      ) : (
        <>
          {liveItems.length > 0 ? (
            <Section title="En direct" items={liveItems} live />
          ) : (
            !theme && <NotifyInvite />
          )}
          {upcomingItems.length > 0 && <Section title="À venir" items={upcomingItems} />}
          {/* Avant les passées : plus bas, le chargement continu le rendrait inaccessible. */}
          <JoinCta />
          <View className="gap-3">
            <SectionTitle>Passées</SectionTitle>
            {pastItems.length === 0 ? (
              <Text className="font-sans text-base text-blanc/85">
                {theme
                  ? 'Aucune intervention ne correspond à ce thème pour l’instant.'
                  : 'Les interventions de David Lisnard apparaîtront ici.'}
              </Text>
            ) : (
              <CardGrid>
                {pastItems.map((item) => (
                  <InterventionCard key={item.id} item={item} />
                ))}
              </CardGrid>
            )}
            {past.isFetchNextPageError && !past.isFetchingNextPage && (
              <Pressable
                accessibilityRole="button"
                onPress={() => past.fetchNextPage({ cancelRefetch: false })}
                className="self-center rounded-full border border-chamois px-5 py-2"
              >
                <Text className="font-sans-semibold text-chamois">
                  Chargement impossible. Réessayer
                </Text>
              </Pressable>
            )}
            {past.isFetchingNextPage && (
              <Text
                accessibilityLiveRegion="polite"
                className="self-center font-sans text-blanc/70"
              >
                Chargement…
              </Text>
            )}
          </View>
        </>
      )}
    </View>
  );
}
