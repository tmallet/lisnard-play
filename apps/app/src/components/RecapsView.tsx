import { useQuery } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { periodLabel, recapPath, recapSummary } from '@/lib/recap';
import { useTRPC } from '@/lib/trpc';

import { RecapShare } from './RecapShare';

const capitalize = (s: string) => `${s.charAt(0).toUpperCase()}${s.slice(1)}`;

/**
 * Vue « Récaps » de la page Campagne (spec campaign-recaps, ADR 0031) : jours avec
 * intervention et semaines récents, à ouvrir ou à publier sur X.
 */
export function RecapsView() {
  const trpc = useTRPC();
  const query = useQuery(trpc.recap.list.queryOptions());
  if (query.isPending)
    return <Text className="font-sans text-base text-blanc/70">Chargement…</Text>;
  if (query.isError)
    return (
      <Text className="font-sans text-base text-blanc/85">
        Les récaps n’ont pas pu être chargés. Réessayez dans un instant.
      </Text>
    );
  const row = (
    key: string,
    href: string,
    label: string,
    summary: string,
    share: React.ReactNode,
  ) => (
    <View key={key} className="gap-1.5 border-blanc/15 border-b pb-3">
      <Link href={href as never} asChild>
        <Pressable accessibilityRole="link">
          <Text className="font-sans-bold text-base text-blanc">{label}</Text>
        </Pressable>
      </Link>
      <Text className="font-sans text-blanc/70 text-sm">{summary}</Text>
      {share}
    </View>
  );
  return (
    <View className="gap-6">
      <Text className="font-sans text-base text-blanc/85 leading-relaxed">
        Le résumé de chaque journée et de chaque semaine : interventions, nouveaux adhérents et
        citation la plus marquante, prêt à partager.
      </Text>
      <View className="gap-3">
        <Text
          role="heading"
          aria-level={2}
          className="font-sans-semibold text-chamois text-xs uppercase tracking-wider"
        >
          Semaines
        </Text>
        {query.data.weeks.map((w) =>
          row(
            w.start,
            recapPath('week', w.start),
            capitalize(`Semaine ${periodLabel('week', w.start, w.end)}`),
            recapSummary(w.count, w.delta),
            <RecapShare period="week" from={w.start} to={w.end} count={w.count} delta={w.delta} />,
          ),
        )}
      </View>
      <View className="gap-3">
        <Text
          role="heading"
          aria-level={2}
          className="font-sans-semibold text-chamois text-xs uppercase tracking-wider"
        >
          Jours
        </Text>
        {query.data.days.map((d) =>
          row(
            d.day,
            recapPath('day', d.day),
            capitalize(periodLabel('day', d.day, d.day)),
            recapSummary(d.count, d.delta),
            <RecapShare period="day" from={d.day} to={d.day} count={d.count} delta={d.delta} />,
          ),
        )}
      </View>
    </View>
  );
}
