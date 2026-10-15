import { Children, isValidElement, type ReactNode } from 'react';
import { View } from 'react-native';

/**
 * Élément de la grille qui occupe toute une rangée (encart inséré entre les cartes).
 * `className` s'applique à la cellule, par exemple pour ne l'afficher qu'à une largeur.
 */
export function GridRow({ children }: { children: ReactNode; className?: string }) {
  return <>{children}</>;
}

/**
 * Grille responsive des cartes : une colonne sur téléphone, deux à partir de 768 px
 * (tablette), trois à partir de 1024 px (ordinateur). Flexbox avec marges négatives :
 * React Native ne connaît pas la grille CSS. Les cartes d'une rangée ont la même hauteur.
 * Un enfant <GridRow> occupe toute la largeur.
 */
export function CardGrid({ children }: { children: ReactNode }) {
  return (
    <View className="-mx-1.5 flex-row flex-wrap">
      {Children.map(children, (child) => (
        <View
          className={`w-full px-1.5 pb-3 ${
            isValidElement<{ className?: string }>(child) && child.type === GridRow
              ? (child.props.className ?? '')
              : 'md:w-1/2 lg:w-1/3'
          }`}
        >
          {child}
        </View>
      ))}
    </View>
  );
}
