import { useQueryClient } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';
import { Platform, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/theme/colors';

import { Footer } from './Footer';
import { ScrollEndProvider, useScrollEndSource } from './ScrollEnd';

interface ScreenProps {
  children: ReactNode;
  /** Pied de page avec la mention d'indépendance (à désactiver si l'écran l'affiche déjà). */
  footer?: boolean;
}

/**
 * Écran mobile (iOS, Android) : la mise en page commune que le web obtient via
 * AppNavigation.web.tsx.
 * - Dégradé signature (ADR 0001) dessiné ici : le conteneur des onglets natifs masque
 *   la racine. ScrollView ne gérant pas les dégradés, une View non « collapsable » le
 *   porte (exigence des onglets natifs pour détecter le défilement).
 * - Pied de page : la mention d'indépendance (spec app-shell).
 * - Fin de défilement signalée au contenu (chargement continu du flux, ScrollEnd).
 * - Tirer pour actualiser : relance les requêtes affichées par l'écran.
 */
export function Screen({ children, footer = true }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const scrollEnd = useScrollEndSource();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await queryClient.refetchQueries({ type: 'active' });
    } finally {
      setRefreshing(false);
    }
  };
  return (
    <ScrollEndProvider value={scrollEnd.listeners}>
      <View
        collapsable={false}
        className="flex-1 bg-bleu-sombre bg-linear-160 from-bleu to-bleu-sombre"
      >
        <ScrollView
          {...scrollEnd.scrollProps}
          testID="screen-scroll"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.blanc}
              colors={[colors.bleu]}
              progressBackgroundColor={colors.blanc}
            />
          }
          contentInsetAdjustmentBehavior="automatic"
          style={Platform.OS === 'android' ? { paddingTop: insets.top } : undefined}
          contentContainerClassName="w-full max-w-3xl self-center gap-6 px-6 py-10"
        >
          {children}
          {footer && <Footer />}
        </ScrollView>
      </View>
    </ScrollEndProvider>
  );
}
