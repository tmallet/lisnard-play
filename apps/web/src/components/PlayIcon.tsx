/**
 * Triangle de lecture, à la taille du texte : le caractère « ▶ » manque à Montserrat
 * (sous-ensembles @fontsource) et le navigateur le dessinerait dans une autre police.
 */
export function PlayIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 10 10"
      className="inline-block size-[0.55em] shrink-0 align-[0.05em]"
      fill="currentColor"
    >
      <path d="M1 0.5 L9.5 5 L1 9.5 Z" />
    </svg>
  );
}
