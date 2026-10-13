import type { ReactNode } from 'react';
import { ScrollView } from 'react-native';

import { ScrollEndProvider, useScrollEndSource } from './ScrollEnd';

interface ScreenProps {
  children: ReactNode;
  /** Sans effet sur le web : le pied de page global (AppNavigation.web.tsx) porte la mention. */
  footer?: boolean;
}

/** Écran web : le fond, l'en-tête et le pied de page viennent de la racine et d'AppNavigation.web. */
export function Screen({ children }: ScreenProps) {
  const scrollEnd = useScrollEndSource();
  return (
    <ScrollEndProvider value={scrollEnd.listeners}>
      <ScrollView
        {...scrollEnd.scrollProps}
        contentContainerClassName="w-full max-w-3xl self-center gap-6 px-6 py-10"
      >
        {children}
      </ScrollView>
    </ScrollEndProvider>
  );
}
