import { useQuery } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { PageHead } from '@/components/PageHead';
import { formatTimestamp } from '@/lib/format';
import {
  formatCount,
  outletChips,
  periodLabel,
  type RecapPeriod,
  recapDescription,
  recapTitle,
} from '@/lib/recap';
import { quoteHref } from '@/lib/site';
import { useTRPC } from '@/lib/trpc';

import { RecapShare } from './RecapShare';

/**
 * Récapitulatif d'une période dans la page Campagne (spec campaign-recaps, ADR 0031) :
 * rendu en composants, sans dépendre de l'image d'aperçu.
 */
export function RecapPanel({ period, start }: { period: RecapPeriod; start: string }) {
  const trpc = useTRPC();
  const query = useQuery(trpc.recap.get.queryOptions({ period, start }));
  const back = (
    <Link href="/campagne?vue=recaps" asChild>
      <Pressable accessibilityRole="link">
        <Text className="font-sans-semibold text-chamois text-sm underline">← Tous les récaps</Text>
      </Pressable>
    </Link>
  );
  if (query.isPending)
    return <Text className="font-sans text-base text-blanc/70">Chargement…</Text>;
  const r = query.data;
  if (query.isError || !r)
    return (
      <View className="gap-3">
        <Text className="font-sans text-base text-blanc/85">
          {query.isError
            ? 'Le récap n’a pas pu être chargé. Réessayez dans un instant.'
            : 'Aucune intervention sur cette période.'}
        </Text>
        {back}
      </View>
    );
  const label = periodLabel(r.period, r.from, r.to);
  const delta = r.members?.delta ?? null;
  return (
    <View className="gap-5">
      <PageHead
        title={`${recapTitle(r.period)}, ${label}`}
        description={recapDescription(r.interventions.length, delta, r.quote?.text ?? null)}
      />
      {back}
      <View className="gap-1">
        <Text className="font-sans-bold text-chamois text-xs uppercase tracking-wider">
          {label}
        </Text>
        <Text role="heading" aria-level={2} className="font-sans-extrabold text-2xl text-blanc">
          {recapTitle(r.period)}
        </Text>
      </View>
      <View className="flex-row flex-wrap gap-x-10 gap-y-4">
        <View>
          <Text className="font-sans-extrabold text-4xl text-blanc">{r.interventions.length}</Text>
          <Text className="font-sans text-blanc/70 text-sm">
            {r.interventions.length > 1 ? 'interventions' : 'intervention'}
          </Text>
        </View>
        {r.members ? (
          <View>
            <Text className="font-sans-extrabold text-4xl text-chamois">
              {r.members.delta >= 0 ? '+' : ''}
              {formatCount(r.members.delta)}
            </Text>
            <Text className="font-sans text-blanc/70 text-sm">
              adhérents · {formatCount(r.members.total)} au total
            </Text>
          </View>
        ) : null}
      </View>
      <Text className="font-sans text-blanc/85 text-sm">
        {outletChips(r.outlets, 8).join(' · ')}
      </Text>
      {r.places.length > 0 ? (
        <Text className="font-sans text-blanc/85 text-sm">
          Déplacements : {r.places.map((p) => p.label).join(' · ')}
        </Text>
      ) : null}
      {r.quote ? (
        <View className="gap-1 border-chamois border-l-2 pl-3">
          <Text className="font-sans-bold text-base text-blanc leading-snug">
            « {r.quote.text} »
          </Text>
          <Link href={quoteHref(r.quote.itemId, r.quote.startS)} asChild>
            <Pressable accessibilityRole="link">
              <Text className="font-sans-semibold text-chamois text-sm underline">
                Écouter le passage ({formatTimestamp(r.quote.startS)})
              </Text>
            </Pressable>
          </Link>
        </View>
      ) : null}
      <RecapShare
        period={r.period}
        from={r.from}
        to={r.to}
        count={r.interventions.length}
        delta={delta}
      />
      <View className="gap-2">
        <Text className="font-sans-semibold text-chamois text-xs uppercase tracking-wider">
          Les interventions
        </Text>
        {r.interventions.map((i) => (
          <Link key={i.id} href={`/interventions/${i.id}`} asChild>
            <Pressable accessibilityRole="link">
              <Text className="font-sans text-sm text-blanc">
                <Text className="text-blanc/60">{i.official ? 'Sa chaîne' : i.outlet} · </Text>
                <Text className="underline">{i.title}</Text>
              </Text>
            </Pressable>
          </Link>
        ))}
      </View>
    </View>
  );
}
