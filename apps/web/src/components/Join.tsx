import { JOIN } from '@/config/join';

/** Lien sortant vers le site d'adhésion : nouvel onglet, sans traceur (ADR 0025). */
const linkProps = {
  href: JOIN.url,
  target: '_blank',
  rel: 'noopener',
} as const;

/**
 * Invitation à adhérer à Nouvelle Énergie (spec app-shell, ADR 0025) : charte de l'app
 * uniquement, parrainage de l'éditeur signalé.
 *
 * `compact` (accueil) : sur téléphone, titre et bouton sur une ligne, sans accroche, et
 * mention courte ; dès la largeur `md`, l'encart retrouve sa forme complète.
 */
export function JoinCta({ compact = false }: { compact?: boolean }) {
  const [before, highlight] = JOIN.title.split(/(idées)/);
  const after = JOIN.title.slice((before?.length ?? 0) + (highlight?.length ?? 0));
  return (
    <aside
      className={`flex flex-col rounded-xl border border-chamois/40 bg-bleu/60 ${compact ? 'gap-2 p-4 md:gap-3 md:p-5' : 'gap-3 p-5'}`}
    >
      <div
        className={
          compact
            ? 'flex flex-wrap items-center gap-x-4 gap-y-2 md:flex-col md:items-start'
            : 'flex flex-col gap-3'
        }
      >
        <h2
          className={`font-sans-extrabold text-blanc uppercase tracking-wide ${compact ? 'text-base md:text-xl' : 'text-xl'}`}
        >
          {before}
          <span className="text-chamois">{highlight}</span>
          {after}
        </h2>
        <p
          className={`font-sans text-base text-blanc/85 leading-relaxed ${compact ? 'hidden md:block' : ''}`}
        >
          {JOIN.pitch}
        </p>
        <a
          {...linkProps}
          className={`self-start rounded-full bg-chamois font-sans-bold text-bleu-sombre active:opacity-80 ${compact ? 'px-4 py-2 text-sm md:px-5 md:py-2.5 md:text-base' : 'px-5 py-2.5 text-base'}`}
        >
          {compact ? (
            <>
              <span className="md:hidden">{JOIN.buttonShort} ↗</span>
              <span className="hidden md:inline">{JOIN.button} ↗</span>
            </>
          ) : (
            `${JOIN.button} ↗`
          )}
        </a>
      </div>
      {compact ? (
        <>
          <p className="font-sans text-blanc/70 text-xs leading-snug md:hidden">
            {JOIN.disclosureShort}
          </p>
          <p className="hidden font-sans text-blanc/70 text-sm leading-snug md:block">
            {JOIN.disclosure}
          </p>
        </>
      ) : (
        <p className="font-sans text-blanc/70 text-sm leading-snug">{JOIN.disclosure}</p>
      )}
    </aside>
  );
}

/**
 * Invitation à adhérer en bandeau fin (accueil sur téléphone) : visible sans défiler,
 * sans masquer la première vidéo. Le parrainage reste signalé.
 */
export function JoinBar() {
  return (
    <aside className="flex flex-col gap-1 rounded-xl border border-chamois/40 bg-bleu/60 px-4 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex-1 font-sans-bold text-blanc text-sm">{JOIN.title}</h2>
        <a
          {...linkProps}
          className="rounded-full bg-chamois px-3.5 py-1.5 font-sans-bold text-bleu-sombre text-sm active:opacity-80"
        >
          {JOIN.buttonShort} ↗
        </a>
      </div>
      <p className="font-sans text-blanc/70 text-xs">{JOIN.disclosureShort}</p>
    </aside>
  );
}
