import type { ReactNode } from 'react';

/**
 * Grille des cartes : une colonne sur téléphone, deux dès 768 px, trois dès 1024 px ; les
 * cartes d'une rangée ont la même hauteur. Un encart `col-span-full` occupe une rangée.
 */
export function CardGrid({ children }: { children: ReactNode }) {
  return <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">{children}</ul>;
}
