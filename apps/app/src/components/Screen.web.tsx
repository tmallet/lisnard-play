import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';

import { Footer } from './Footer';
import { IndependenceNote } from './IndependenceNote';
import { ScrollEndProvider, useScrollEndSource } from './ScrollEnd';

interface ScreenProps {
  children: ReactNode;
  /** Zone de contenu élargie (grille de l'accueil) ; sinon colonne de lecture. */
  wide?: boolean;
  /**
   * Sur téléphone, pied de page en fin de défilement (false : l'écran porte déjà le lien
   * vers les mentions légales, comme « À propos »). Dès md, pied de page fixe global.
   */
  footer?: boolean;
}

/**
 * Écran web : le fond et l'en-tête viennent de la racine et d'AppNavigation.web. Le pied de
 * page est fixe dès la largeur md (WebChrome) ; sur téléphone, il termine le défilement.
 */
export function Screen({ children, wide = false, footer = true }: ScreenProps) {
  const scrollEnd = useScrollEndSource();
  return (
    <ScrollEndProvider value={scrollEnd.listeners}>
      <ScrollView
        {...scrollEnd.scrollProps}
        contentContainerClassName={`w-full self-center gap-4 px-6 py-6 md:gap-6 md:py-10 ${wide ? 'max-w-6xl' : 'max-w-3xl'}`}
      >
        {/* Téléphone : mention visible dès l'ouverture, pied de page complet en fin de page. */}
        <View className="md:hidden">
          <IndependenceNote />
        </View>
        {children}
        {footer ? (
          <View className="md:hidden">
            <Footer />
          </View>
        ) : null}
      </ScrollView>
    </ScrollEndProvider>
  );
}
