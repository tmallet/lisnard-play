/** Indicateur « en direct » : émeraude de la charte (spec intervention-feed). */
export function LiveBadge() {
  return (
    <span className="flex items-center gap-1.5 self-start rounded-full bg-emeraude px-2.5 py-1">
      <span aria-hidden="true" className="size-2 rounded-full bg-bleu-sombre" />
      <span className="font-sans-bold text-bleu-sombre text-xs uppercase tracking-wider">
        En direct
      </span>
    </span>
  );
}
