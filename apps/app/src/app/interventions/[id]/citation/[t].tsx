import { useQuery } from '@tanstack/react-query';
import { Link, Redirect, router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

import { PageHead } from '@/components/PageHead';
import { PlayerConsent } from '@/components/PlayerConsent';
import { Screen } from '@/components/Screen';
import { ShareImageButton } from '@/components/ShareImageButton';
import { ShareXButton } from '@/components/ShareXButton';
import { WebChrome } from '@/components/WebChrome';
import { formatDate, formatTimestamp, quoteSource, THEME_LABELS, type Theme } from '@/lib/format';
import { quotePageDescription, quotePageTitle } from '@/lib/quote-meta';
import { shareLink } from '@/lib/share';
import { quotePath, siteOrigin } from '@/lib/site';
import { useTRPC } from '@/lib/trpc';
import { colors } from '@/theme/colors';
import { fontFamily } from '@/theme/fonts';

/**
 * Page d'une citation (spec intervention-quotes, ADR 0028) : la citation en grand, son
 * contexte et le lecteur calé sur le passage. Si la citation a changé (résumé
 * régénéré), l'intervention s'ouvre au même moment.
 */
export default function QuotePage() {
  const { id, t } = useLocalSearchParams<{ id: string; t: string }>();
  const valid = /^\d+$/.test(String(t));
  const startS = valid ? Number(t) : 0;
  const trpc = useTRPC();
  const quote = useQuery(
    trpc.quotes.at.queryOptions({ id: String(id), t: startS }, { retry: false, enabled: valid }),
  );
  const detail = useQuery(
    trpc.interventions.byId.queryOptions({ id: String(id) }, { retry: false }),
  );
  const [playRequest, setPlayRequest] = useState(0);
  const [copied, setCopied] = useState(false);

  // Minutage illisible : l'intervention, sans deviner de passage. Dans un effet, pour que
  // le gabarit pré-rendu au build (paramètres inconnus) garde ses balises.
  useEffect(() => {
    if (!valid) router.replace(`/interventions/${String(id)}`);
  }, [valid, id]);
  if (quote.isSuccess && quote.data === null)
    return <Redirect href={`/interventions/${String(id)}?t=${startS}`} />;

  const q = quote.data;
  const media = detail.data?.media;
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
          title={q ? quotePageTitle(q) : 'Citation'}
          description={q ? quotePageDescription(q) : undefined}
        />
        {!q ? (
          <Text className="font-sans text-base text-blanc/70">
            {quote.isError ? 'La citation n’a pas pu être chargée.' : 'Chargement…'}
          </Text>
        ) : (
          <View className="gap-5">
            <Text className="font-sans-extrabold text-2xl text-blanc leading-snug">
              « {q.text} »
            </Text>
            <Text className="font-sans-semibold text-chamois text-sm">
              David Lisnard · {quoteSource(q)} · {formatDate(`${q.day}T12:00:00Z`)} · à{' '}
              {formatTimestamp(q.startS)}
              {q.theme && q.theme in THEME_LABELS ? ` · ${THEME_LABELS[q.theme as Theme]}` : ''}
            </Text>
            {media?.kind === 'embed' ? (
              <PlayerConsent
                embedUrl={media.embedUrl}
                provider={media.provider}
                title={q.title}
                posterUrl={detail.data?.thumbnailUrl ?? null}
                startS={q.startS}
                playRequest={playRequest}
              />
            ) : null}
            <View className="flex-row flex-wrap gap-x-5 gap-y-2">
              <Pressable
                accessibilityRole="button"
                onPress={() => setPlayRequest((n) => n + 1)}
                className="rounded-full bg-chamois px-4 py-1.5 active:opacity-80"
              >
                <Text className="font-sans-bold text-bleu-sombre text-sm">
                  ▶ Écouter le passage
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={async () => {
                  const result = await shareLink(
                    `${siteOrigin()}${quotePath(q.itemId, q.startS)}`,
                    q.title,
                  );
                  setCopied(result === 'copied');
                }}
              >
                <Text className="font-sans-semibold text-chamois text-sm underline">
                  {copied ? 'Lien copié' : 'Partager la citation'}
                </Text>
              </Pressable>
              <ShareImageButton itemId={q.itemId} startS={q.startS} />
              <ShareXButton itemId={q.itemId} startS={q.startS} text={q.text} />
              <Link href={`/interventions/${q.itemId}`} asChild>
                <Pressable accessibilityRole="link">
                  <Text className="font-sans-semibold text-chamois text-sm underline">
                    Voir l’intervention complète
                  </Text>
                </Pressable>
              </Link>
            </View>
            <Text className="font-sans text-blanc/60 text-xs">
              {q.title}. Transcription automatique : écoutez le passage pour vérifier. La vidéo se
              charge depuis YouTube, qui peut alors déposer des cookies.
            </Text>
          </View>
        )}
      </Screen>
    </WebChrome>
  );
}
