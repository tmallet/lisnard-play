import { useQuery } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { formatDate, formatTimestamp } from '@/lib/format';
import { quoteHref } from '@/lib/site';
import { useTRPC } from '@/lib/trpc';

import { CardGrid } from './CardGrid';
import { InterventionCard } from './InterventionCard';

/** Résultats de recherche (spec intervention-quotes) : citations d'abord, puis interventions. */
export function SearchResults({ q }: { q: string }) {
  const trpc = useTRPC();
  const result = useQuery(trpc.search.query.queryOptions({ q }, { enabled: q.length >= 2 }));

  if (q.length < 2)
    return (
      <Text className="font-sans text-base text-blanc/70">Saisissez au moins deux caractères.</Text>
    );
  if (result.isPending)
    return <Text className="font-sans text-base text-blanc/70">Recherche…</Text>;
  if (result.isError)
    return (
      <Text className="font-sans text-base text-blanc/85">
        La recherche n’a pas abouti. Réessayez.
      </Text>
    );

  const { quotes, interventions } = result.data;
  if (quotes.length === 0 && interventions.length === 0)
    return <Text className="font-sans text-base text-blanc/85">Aucun résultat pour « {q} ».</Text>;

  return (
    <View className="gap-6">
      {quotes.length > 0 ? (
        <View className="gap-3">
          <Text
            role="heading"
            aria-level={2}
            className="font-sans-extrabold text-blanc text-xl uppercase tracking-wide"
          >
            Citations
          </Text>
          {quotes.map((quote) => (
            <Link
              key={`${quote.itemId}-${quote.startS}`}
              href={quoteHref(quote.itemId, quote.startS)}
              asChild
            >
              <Pressable
                accessibilityRole="link"
                className="gap-1.5 rounded-xl border border-blanc/15 bg-blanc/5 p-4 active:bg-blanc/10"
              >
                <Text className="font-sans-bold text-base text-blanc leading-snug">
                  « {quote.text} »
                </Text>
                <Text className="font-sans-semibold text-chamois text-xs uppercase tracking-wider">
                  {quote.official ? 'David Lisnard' : quote.outlet} ·{' '}
                  {formatDate(`${quote.day}T12:00:00Z`)} · ▶ {formatTimestamp(quote.startS)}
                </Text>
              </Pressable>
            </Link>
          ))}
        </View>
      ) : null}
      {interventions.length > 0 ? (
        <View className="gap-3">
          <Text
            role="heading"
            aria-level={2}
            className="font-sans-extrabold text-blanc text-xl uppercase tracking-wide"
          >
            Interventions
          </Text>
          <CardGrid>
            {interventions.map((item) => (
              <InterventionCard key={item.id} item={item} />
            ))}
          </CardGrid>
        </View>
      ) : null}
      <Text className="font-sans text-blanc/60 text-xs">
        Citations transcrites automatiquement : écoutez le passage pour vérifier.
      </Text>
    </View>
  );
}
