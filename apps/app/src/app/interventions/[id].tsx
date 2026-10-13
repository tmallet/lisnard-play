import { useQuery } from '@tanstack/react-query';
import { TRPCClientError } from '@trpc/client';
import { Link, Stack, useLocalSearchParams } from 'expo-router';
import { Linking, Platform, Pressable, Text, View } from 'react-native';

import { LinkCard } from '@/components/LinkCard';
import { LiveBadge } from '@/components/LiveBadge';
import { MediaEmbed } from '@/components/MediaEmbed';
import { PageHead } from '@/components/PageHead';
import { Screen } from '@/components/Screen';
import { WebChrome } from '@/components/WebChrome';
import { formatDate, formatDateTime, kindLabel, ROLE_LABELS } from '@/lib/format';
import { useTRPC } from '@/lib/trpc';
import { colors } from '@/theme/colors';
import { fontFamily } from '@/theme/fonts';

/**
 * Détail d'une intervention (spec intervention-feed). Rendu côté client : en SDK 57,
 * la route dynamique est pré-rendue comme gabarit (ADR 0011).
 */
export default function InterventionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const trpc = useTRPC();
  const { data, error, isPending, refetch } = useQuery(
    trpc.interventions.byId.queryOptions({ id: String(id) }, { retry: false }),
  );

  return (
    <WebChrome>
      <Stack.Screen
        options={{
          headerShown: Platform.OS !== 'web',
          title: '',
          headerBackTitle: 'Retour',
          headerTintColor: colors.blanc,
          headerStyle: { backgroundColor: colors.bleuSombre },
          headerTitleStyle: { fontFamily: fontFamily.semibold },
        }}
      />
      <Screen>
        <PageHead
          title={data?.title ?? 'Intervention'}
          description={data?.description || undefined}
        />
        {isPending ? (
          <Text className="font-sans text-base text-blanc/70">Chargement…</Text>
        ) : error && !(error instanceof TRPCClientError && error.data?.code === 'NOT_FOUND') ? (
          <View className="gap-4">
            <Text className="font-sans text-base text-blanc/85">
              L’intervention n’a pas pu être chargée. Vérifiez votre connexion.
            </Text>
            <Pressable accessibilityRole="button" onPress={() => refetch()}>
              <Text className="font-sans-semibold text-base text-chamois underline">Réessayer</Text>
            </Pressable>
          </View>
        ) : !data ? (
          <View className="gap-4">
            <Text
              role="heading"
              aria-level={1}
              className="font-sans-extrabold text-2xl text-blanc uppercase"
            >
              Intervention introuvable
            </Text>
            <Link href="/" className="font-sans-semibold text-base text-chamois underline">
              Revenir à l’accueil
            </Link>
          </View>
        ) : (
          <View className="gap-5">
            {data.status === 'live' ? <LiveBadge /> : null}
            <Text className="font-sans-semibold text-chamois text-xs uppercase tracking-wider">
              {data.outlet} · {kindLabel(data.kind)} · {ROLE_LABELS[data.role]}
            </Text>
            <Text
              role="heading"
              aria-level={1}
              className="font-sans-extrabold text-2xl text-blanc leading-tight"
            >
              {data.title}
            </Text>
            <Text className="font-sans text-blanc/70 text-sm">
              {data.status === 'upcoming' ? formatDateTime(data.date) : formatDate(data.date)}
            </Text>
            {data.media.kind === 'embed' ? (
              <MediaEmbed embedUrl={data.media.embedUrl} title={data.title} />
            ) : (
              <LinkCard
                url={data.url}
                og={data.media.og}
                fallbackTitle={data.title}
                outlet={data.outlet}
              />
            )}
            {data.description ? (
              <Text className="font-sans text-base text-blanc/85 leading-relaxed">
                {data.description}
              </Text>
            ) : null}
            <Pressable accessibilityRole="link" onPress={() => Linking.openURL(data.url)}>
              <Text className="font-sans-semibold text-base text-chamois underline">
                Voir la source sur {data.outlet} ↗
              </Text>
            </Pressable>
          </View>
        )}
      </Screen>
    </WebChrome>
  );
}
