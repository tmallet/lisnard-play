import type { ReactNode, RefObject } from 'react';
import { ScrollView, View } from 'react-native';

import { IndependenceNote } from './IndependenceNote';
import { ScrollEndProvider, useScrollEndSource } from './ScrollEnd';

interface ScreenProps {
  children: ReactNode;
  /** Zone de contenu élargie (grille de l'accueil) ; sinon colonne de lecture. */
  wide?: boolean;
  /**
   * Sur téléphone, mention d'indépendance en tête de contenu ; false si l'écran l'affiche
   * déjà (« À propos », mentions légales). Dès md, pied de page fixe global.
   */
  footer?: boolean;
  /** Accès au défilement (remonter vers le lecteur, par exemple). */
  scrollRef?: RefObject<ScrollView | null>;
}

/**
 * Écran web : le fond et l'en-tête viennent de la racine et d'AppNavigation.web. Le pied de
 * page est fixe dès la largeur md (WebChrome) ; sur téléphone, la mention et le lien
 * légal ouvrent le contenu, une seule fois, sans pied de page en double.
 */
export function Screen({ children, wide = false, footer = true, scrollRef }: ScreenProps) {
  const scrollEnd = useScrollEndSource();
  return (
    <ScrollEndProvider value={scrollEnd.listeners}>
      <ScrollView
        {...scrollEnd.scrollProps}
        ref={scrollRef}
        contentContainerClassName={`w-full self-center gap-4 px-6 py-6 md:gap-6 md:py-10 ${wide ? 'max-w-6xl' : 'max-w-3xl'}`}
      >
        {/* Téléphone : mention visible dès l'ouverture, sans pied de page fixe. */}
        {footer ? (
          <View className="md:hidden">
            <IndependenceNote />
          </View>
        ) : null}
        {children}
      </ScrollView>
    </ScrollEndProvider>
  );
}
