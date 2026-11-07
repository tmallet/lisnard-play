import { View } from 'react-native';

import { CardGrid } from './CardGrid';

/** Cartes fantômes pendant le premier chargement ; pulsation coupée si l'on réduit les animations. */
export function FeedSkeleton() {
  return (
    <View
      role="progressbar"
      accessibilityLabel="Chargement des interventions"
      accessibilityLiveRegion="polite"
      className="gap-3"
    >
      <View className="h-6 w-32 rounded-full bg-blanc/10" />
      <CardGrid>
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            className="flex-1 animate-pulse overflow-hidden rounded-[20px] border border-blanc/10 bg-blanc/5 motion-reduce:animate-none"
          >
            <View className="aspect-video w-full bg-blanc/10" />
            <View className="gap-2 p-4">
              <View className="h-3 w-1/2 rounded-full bg-blanc/10" />
              <View className="h-4 w-5/6 rounded-full bg-blanc/15" />
              <View className="h-3 w-1/3 rounded-full bg-blanc/10" />
            </View>
          </View>
        ))}
      </CardGrid>
    </View>
  );
}
