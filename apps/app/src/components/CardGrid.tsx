import { Children, type ReactNode } from 'react';
import { View } from 'react-native';

/**
 * Grille responsive des cartes : une colonne sur téléphone, deux à partir de 768 px
 * (tablette), trois à partir de 1024 px (ordinateur). Flexbox avec marges négatives :
 * React Native ne connaît pas la grille CSS. Les cartes d'une rangée ont la même hauteur.
 */
export function CardGrid({ children }: { children: ReactNode }) {
  return (
    <View className="-mx-1.5 flex-row flex-wrap">
      {Children.map(children, (child) => (
        <View className="w-full px-1.5 pb-3 md:w-1/2 lg:w-1/3">{child}</View>
      ))}
    </View>
  );
}
