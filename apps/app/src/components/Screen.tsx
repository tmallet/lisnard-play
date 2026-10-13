import type { ReactNode } from 'react';
import { Platform, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { APP_NAME } from '@/config/app';

import { Footer } from './Footer';

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
 * - En-tête : le nom de l'application en surtitre (spec app-shell, nom centralisé).
 * - Pied de page : la mention d'indépendance (spec app-shell).
 */
export function Screen({ children, footer = true }: ScreenProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      collapsable={false}
      className="flex-1 bg-bleu-sombre bg-linear-160 from-bleu to-bleu-sombre"
    >
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={Platform.OS === 'android' ? { paddingTop: insets.top } : undefined}
        contentContainerClassName="w-full max-w-3xl self-center gap-6 px-6 py-10"
      >
        <Text
          role="banner"
          className="font-sans-semibold text-blanc/75 text-xs uppercase tracking-widest"
        >
          {APP_NAME}
        </Text>
        {children}
        {footer && <Footer />}
      </ScrollView>
    </View>
  );
}
