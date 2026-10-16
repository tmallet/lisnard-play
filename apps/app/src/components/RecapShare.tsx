import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { type RecapPeriod, recapPath, recapShareText } from '@/lib/recap';
import { shareLink } from '@/lib/share';
import { siteOrigin } from '@/lib/site';

import { XPublishButton } from './XPublishButton';

/** « Publier sur X » et « Partager » d'un récapitulatif (spec campaign-recaps). */
export function RecapShare(props: {
  period: RecapPeriod;
  from: string;
  to: string;
  count: number;
  delta: number | null;
}) {
  const [copied, setCopied] = useState(false);
  const url = `${siteOrigin()}${recapPath(props.period, props.from)}`;
  const text = recapShareText(props.period, props.from, props.to, props.count, props.delta);
  return (
    <View className="flex-row flex-wrap items-center gap-x-4 gap-y-1">
      <XPublishButton text={text} url={url} label="Publier sur X" />
      <Pressable
        accessibilityRole="button"
        onPress={async () => setCopied((await shareLink(url, text)) === 'copied')}
      >
        <Text className="font-sans-semibold text-chamois text-sm underline">
          {copied ? 'Lien copié' : 'Partager'}
        </Text>
      </Pressable>
    </View>
  );
}
