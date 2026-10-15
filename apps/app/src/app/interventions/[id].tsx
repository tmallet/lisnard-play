import { useQuery } from '@tanstack/react-query';
import { TRPCClientError } from '@trpc/client';
import { Link, router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, Platform, Pressable, Text, View } from 'react-native';

import { JoinCta } from '@/components/JoinCta';
import { LinkCard } from '@/components/LinkCard';
import { LiveBadge } from '@/components/LiveBadge';
import { PageHead } from '@/components/PageHead';
import { PlayerConsent } from '@/components/PlayerConsent';
import { QuotesBlock } from '@/components/QuotesBlock';
import { Screen } from '@/components/Screen';
import { SummaryBlock } from '@/components/SummaryBlock';
import { WebChrome } from '@/components/WebChrome';
import { kindLabelFor, repeatsTitle, themesLabel, whenLabel } from '@/lib/format';
import { useTRPC } from '@/lib/trpc';
import { useMinuteTick } from '@/lib/useMinuteTick';
import { colors } from '@/theme/colors';
import { fontFamily } from '@/theme/fonts';

/**
 * Détail d'une intervention (spec intervention-feed). Rendu côté client : en SDK 57,
 * la route dynamique est pré-rendue comme gabarit (ADR 0011).
 */
export default function InterventionDetail() {
  const { id, t } = useLocalSearchParams<{ id: string; t?: string }>();
  const startS = t !== undefined && /^\d+$/.test(t) ? Number(t) : undefined;
  // Écouter une citation : le lecteur se lance au moment voulu (spec intervention-quotes).
  const [playRequest, setPlayRequest] = useState(0);
  const play = (seconds: number) => {
    router.setParams({ t: String(seconds) });
    setPlayRequest((n) => n + 1);
    if (Platform.OS === 'web')
      document.getElementById('lecteur')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
  const trpc = useTRPC();
  const { data, error, isPending, refetch } = useQuery(
    trpc.interventions.byId.queryOptions({ id: String(id) }, { retry: false }),
  );
  // Les descriptions de Google News ne font souvent que répéter « titre + média ».
  const now = useMinuteTick(data?.status === 'live');
  const description =
    data?.description && !repeatsTitle(data.description, data.title, data.outlet)
      ? data.description
      : null;

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
        <PageHead title={data?.title ?? 'Intervention'} description={description ?? undefined} />
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
              {data.outlet} · {kindLabelFor(data.status, data.kind)}
              {data.themes.length > 0 ? ` · ${themesLabel(data.themes)}` : ''}
            </Text>
            <Text
              role="heading"
              aria-level={1}
              className="font-sans-extrabold text-2xl text-blanc leading-tight"
            >
              {data.title}
            </Text>
            <Text className="font-sans text-blanc/70 text-sm">
              {whenLabel(data.status, data.date, now)}
            </Text>
            {data.media.kind === 'embed' ? (
              <View nativeID="lecteur">
                <PlayerConsent
                  embedUrl={data.media.embedUrl}
                  provider={data.media.provider}
                  title={data.title}
                  posterUrl={data.thumbnailUrl}
                  startS={startS}
                  playRequest={playRequest}
                />
              </View>
            ) : (
              <LinkCard
                // URL de l'éditeur pour un article relayé par Google News (ADR 0021).
                url={data.media.url ?? data.url}
                og={data.media.og}
                outlet={data.outlet}
                shownTexts={description ? [data.title, description] : [data.title]}
              />
            )}
            {data.summary ? <SummaryBlock {...data.summary} /> : null}
            {data.media.kind === 'embed' ? (
              <QuotesBlock itemId={data.id} title={data.title} quotes={data.quotes} onPlay={play} />
            ) : null}
            {description ? (
              <Text className="font-sans text-base text-blanc/85 leading-relaxed">
                {description}
              </Text>
            ) : null}
            {/* Pour un rendu `link`, la carte est déjà le lien vers la source. */}
            {data.media.kind === 'embed' ? (
              <Pressable accessibilityRole="link" onPress={() => Linking.openURL(data.url)}>
                <Text className="font-sans-semibold text-base text-chamois underline">
                  Voir la source sur {data.outlet} ↗
                </Text>
              </Pressable>
            ) : null}
            <JoinCta />
          </View>
        )}
      </Screen>
    </WebChrome>
  );
}
