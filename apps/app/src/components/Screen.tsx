import type { ReactNode } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { withUniwind } from 'uniwind';

const StyledSafeAreaView = withUniwind(SafeAreaView);

/** Conteneur de page : zone sûre, défilement, largeur de lecture limitée. */
export function Screen({ children }: { children: ReactNode }) {
  return (
    <StyledSafeAreaView edges={['top']} className="flex-1">
      <ScrollView contentContainerClassName="w-full max-w-3xl self-center gap-6 px-6 py-10">
        {children}
      </ScrollView>
    </StyledSafeAreaView>
  );
}
