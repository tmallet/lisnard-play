import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { formatTimestamp, THEME_LABELS, type Theme } from '@/lib/format';
import { shareLink } from '@/lib/share';
import { quoteHref, quotePath, siteOrigin } from '@/lib/site';
import { ShareImageButton } from './ShareImageButton';
import { ShareXButton } from './ShareXButton';

export interface QuoteItem {
  text: string;
  startS: number;
  theme: string | null;
}

/**
 * Citations horodatées d'une vidéo (spec intervention-quotes, ADR 0028) : chaque citation
 * lance le lecteur officiel à son moment, a sa page et se partage. Transcription
 * automatique, signalée.
 */
export function QuotesBlock({
  itemId,
  title,
  quotes,
  onPlay,
}: {
  itemId: string;
  title: string;
  quotes: QuoteItem[];
  onPlay: (startS: number) => void;
}) {
  const [copied, setCopied] = useState<number | null>(null);
  // Citation dont les options de partage sont dépliées.
  const [sharing, setSharing] = useState<number | null>(null);
  if (quotes.length === 0) return null;
  return (
    <View className="gap-3">
      <Text
        role="heading"
        aria-level={2}
        className="font-sans-semibold text-chamois text-xs uppercase tracking-wider"
      >
        Citations
      </Text>
      {quotes.map((quote) => (
        <View key={quote.startS} className="gap-2 border-chamois border-l-2 pl-3">
          <Text className="font-sans-bold text-base text-blanc leading-snug">« {quote.text} »</Text>
          <View className="flex-row flex-wrap items-center gap-x-4 gap-y-1">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Écouter le passage à ${formatTimestamp(quote.startS)}`}
              onPress={() => onPlay(quote.startS)}
              className="rounded-full bg-chamois px-3 py-1 active:opacity-80"
            >
              <Text className="font-sans-bold text-bleu-sombre text-sm">
                ▶ {formatTimestamp(quote.startS)}
              </Text>
            </Pressable>
            <Link href={quoteHref(itemId, quote.startS)} asChild>
              <Pressable accessibilityRole="link">
                <Text className="font-sans-semibold text-chamois text-sm underline">
                  Voir la citation
                </Text>
              </Pressable>
            </Link>
            {/* Partages regroupés : une seule entrée, qui déplie lien, image et X. */}
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: sharing === quote.startS }}
              accessibilityLabel={`Partager la citation à ${formatTimestamp(quote.startS)}`}
              onPress={() => setSharing(sharing === quote.startS ? null : quote.startS)}
            >
              <Text className="font-sans-semibold text-chamois text-sm underline">Partager</Text>
            </Pressable>
            {quote.theme && quote.theme in THEME_LABELS ? (
              <Text className="font-sans text-blanc/70 text-xs">
                {THEME_LABELS[quote.theme as Theme]}
              </Text>
            ) : null}
          </View>
          {sharing === quote.startS ? (
            <View className="flex-row flex-wrap items-center gap-x-4 gap-y-1">
              <Pressable
                accessibilityRole="button"
                onPress={async () => {
                  const result = await shareLink(
                    `${siteOrigin()}${quotePath(itemId, quote.startS)}`,
                    title,
                  );
                  if (result === 'copied') setCopied(quote.startS);
                }}
              >
                <Text className="font-sans-semibold text-chamois text-sm underline">
                  {copied === quote.startS ? 'Lien copié' : 'Lien'}
                </Text>
              </Pressable>
              <ShareImageButton itemId={itemId} startS={quote.startS} label="Image" />
              <ShareXButton itemId={itemId} startS={quote.startS} text={quote.text} label="X" />
            </View>
          ) : null}
        </View>
      ))}
      <Text className="font-sans text-blanc/60 text-xs">
        Transcription automatique : écoutez le passage pour vérifier. La vidéo se charge depuis
        YouTube, qui peut alors déposer des cookies.
      </Text>
    </View>
  );
}
