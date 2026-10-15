import { useState } from 'react';
import { Pressable, Text } from 'react-native';

import { shareImage } from '@/lib/share-image';
import { quoteImageUrl } from '@/lib/site';

const MESSAGES = {
  downloaded: 'Image téléchargée',
  failed: 'Image indisponible',
} as const;

/** « Partager en image » (spec intervention-quotes, ADR 0029). */
export function ShareImageButton({
  itemId,
  startS,
  label = 'Partager en image',
}: {
  itemId: string;
  startS: number;
  label?: string;
}) {
  const [state, setState] = useState<'idle' | 'busy' | keyof typeof MESSAGES>('idle');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Partager la citation en image"
      disabled={state === 'busy'}
      onPress={async () => {
        setState('busy');
        const result = await shareImage(
          quoteImageUrl(itemId, startS),
          `citation-david-lisnard-${startS}.png`,
        );
        setState(result === 'downloaded' || result === 'failed' ? result : 'idle');
      }}
    >
      <Text className="font-sans-semibold text-chamois text-sm underline">
        {state === 'busy' ? 'Préparation…' : state === 'idle' ? label : MESSAGES[state]}
      </Text>
    </Pressable>
  );
}
