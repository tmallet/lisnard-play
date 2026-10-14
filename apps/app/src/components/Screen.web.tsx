import type { ReactNode } from 'react';
import { ScrollView } from 'react-native';

import { ScrollEndProvider, useScrollEndSource } from './ScrollEnd';

interface ScreenProps {
  children: ReactNode;
  /** Zone de contenu élargie (grille de l'accueil) ; sinon colonne de lecture. */
  wide?: boolean;
  /** Sans effet sur le web : le pied de page global (AppNavigation.web.tsx) porte la mention. */
  footer?: boolean;
}

/** Écran web : le fond, l'en-tête et le pied de page viennent de la racine et d'AppNavigation.web. */
export function Screen({ children, wide = false }: ScreenProps) {
  const scrollEnd = useScrollEndSource();
  return (
    <ScrollEndProvider value={scrollEnd.listeners}>
      <ScrollView
        {...scrollEnd.scrollProps}
        contentContainerClassName={`w-full self-center gap-6 px-6 py-10 ${wide ? 'max-w-6xl' : 'max-w-3xl'}`}
      >
        {children}
      </ScrollView>
    </ScrollEndProvider>
  );
}
