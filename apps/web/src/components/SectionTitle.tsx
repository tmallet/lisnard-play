/** Titre d'une section de l'accueil ; « En direct » en émeraude (spec intervention-feed). */
export function SectionTitle({ children, live = false }: { children: string; live?: boolean }) {
  return (
    <h2
      className={`font-sans-extrabold text-xl uppercase tracking-wide ${live ? 'text-emeraude' : 'text-blanc'}`}
    >
      {children}
    </h2>
  );
}
