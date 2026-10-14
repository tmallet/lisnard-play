import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { useTRPC } from '@/lib/trpc';

import { CardGrid } from './CardGrid';
import { InterventionCard, type InterventionCardData } from './InterventionCard';
import { useOnEndReached } from './ScrollEnd';
import { ThemeFilter, type ThemeFilterValue } from './ThemeFilter';

/** Rafraîchissement des directs et des interventions à venir (spec intervention-feed). */
const REFRESH_MS = 60_000;

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
      { getNextPageParam: (last) => last.nextCursor ?? undefined },
    ),
  );

  // Chargement continu : la page suivante arrive à l'approche du bas de l'écran.
  useOnEndReached(() => {
    if (past.hasNextPage && !past.isFetchingNextPage && !past.isError) past.fetchNextPage();
  });

  const liveItems = live.data?.items ?? [];
  const upcomingItems = upcoming.data?.items ?? [];
  const pastItems = past.data?.pages.flatMap((p) => p.items) ?? [];
  const loading = live.isPending || upcoming.isPending || past.isPending;
  const failed = live.isError || upcoming.isError || past.isError;

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
          {liveItems.length > 0 && <Section title="En direct" items={liveItems} live />}
          {upcomingItems.length > 0 && <Section title="À venir" items={upcomingItems} />}
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
