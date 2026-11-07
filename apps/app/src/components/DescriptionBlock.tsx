import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

/** Description YouTube repliée sur quatre lignes : souvent longue et pleine de liens. */
export function DescriptionBlock({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <View className="gap-2">
      <Text
        role="heading"
        aria-level={2}
        className="font-sans-bold text-chamois text-xs uppercase tracking-widest"
      >
        Description
      </Text>
      <Text
        numberOfLines={open ? undefined : 4}
        className="font-sans text-base text-blanc/85 leading-relaxed"
      >
        {text}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(!open)}
        className="min-h-10 justify-center self-start"
      >
        <Text className="font-sans-semibold text-chamois text-sm underline">
          {open ? 'Réduire' : 'Afficher toute la description'}
        </Text>
      </Pressable>
    </View>
  );
}
