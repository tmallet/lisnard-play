import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useTRPC } from '@/lib/trpc';

import { InterventionCard, type InterventionCardData } from './InterventionCard';
import { RoleFilter, type RoleFilterValue } from './RoleFilter';

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
      {items.map((item) => (
        <InterventionCard key={item.id} item={item} />
      ))}
    </View>
  );
}

/** Accueil : « En direct », « À venir », « Passées », filtrables par rôle. */
export function InterventionFeed() {
  const trpc = useTRPC();
  const [roleFilter, setRoleFilter] = useState<RoleFilterValue>('all');
  const role = roleFilter === 'all' ? undefined : roleFilter;

  const live = useQuery(
    trpc.interventions.list.queryOptions({ status: 'live', role }, { refetchInterval: REFRESH_MS }),
  );
  const upcoming = useQuery(
    trpc.interventions.list.queryOptions(
      { status: 'upcoming', role },
      { refetchInterval: REFRESH_MS },
    ),
  );
  const past = useInfiniteQuery(
    trpc.interventions.list.infiniteQueryOptions(
      { status: 'past', role, limit: 20 },
      { getNextPageParam: (last) => last.nextCursor ?? undefined },
    ),
  );

  const liveItems = live.data?.items ?? [];
  const upcomingItems = upcoming.data?.items ?? [];
  const pastItems = past.data?.pages.flatMap((p) => p.items) ?? [];
  const loading = live.isPending || upcoming.isPending || past.isPending;
  const failed = live.isError || upcoming.isError || past.isError;

  return (
    <View className="gap-8">
      <RoleFilter value={roleFilter} onChange={setRoleFilter} />
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
                Les interventions de David Lisnard apparaîtront ici.
              </Text>
            ) : (
              pastItems.map((item) => <InterventionCard key={item.id} item={item} />)
            )}
            {past.hasNextPage && (
              <Pressable
                accessibilityRole="button"
                onPress={() => past.fetchNextPage()}
                disabled={past.isFetchingNextPage}
                className="self-center rounded-full border border-chamois px-5 py-2"
              >
                <Text className="font-sans-semibold text-chamois">
                  {past.isFetchingNextPage ? 'Chargement…' : 'Voir plus'}
                </Text>
              </Pressable>
            )}
          </View>
        </>
      )}
    </View>
  );
}
