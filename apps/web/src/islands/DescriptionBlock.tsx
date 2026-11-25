import { useState } from 'react';

/**
 * Description YouTube repliée sur quatre lignes : souvent longue et pleine de liens. Sans
 * JavaScript, elle s'affiche en entier (variante `js:`) et le bouton n'apparaît pas.
 */
export default function DescriptionBlock({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-sans-bold text-chamois text-xs uppercase tracking-widest">Description</h2>
      <p
        className={`whitespace-pre-line font-sans text-base text-blanc/85 leading-relaxed ${open ? '' : 'js:line-clamp-4'}`}
      >
        {text}
      </p>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="hidden min-h-10 items-center self-start font-sans-semibold text-chamois text-sm underline js:flex"
      >
        {open ? 'Réduire' : 'Afficher toute la description'}
      </button>
    </section>
  );
}
