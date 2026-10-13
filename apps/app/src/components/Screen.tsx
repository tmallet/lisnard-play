import type { ReactNode } from 'react';
import { Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Conteneur de page : fond, défilement, largeur de lecture limitée.
 *
 * Mobile : le conteneur natif des onglets masque le fond de la racine, l'écran
 * dessine donc lui-même le dégradé signature (ADR 0001). ScrollView ne gérant pas
 * les dégradés, une View les porte ; elle est non « collapsable » pour que la barre
 * d'onglets native détecte le défilement. Web : le dégradé reste celui de la racine.
 */
export function Screen({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      collapsable={false}
      className={
        Platform.OS === 'web'
          ? 'flex-1'
          : 'flex-1 bg-bleu-sombre bg-linear-160 from-bleu to-bleu-sombre'
      }
    >
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={Platform.OS === 'android' ? { paddingTop: insets.top } : undefined}
        contentContainerClassName="w-full max-w-3xl self-center gap-6 px-6 py-10"
      >
        {children}
      </ScrollView>
    </View>
  );
}
