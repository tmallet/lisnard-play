import { useEffect, useState } from 'react';
import { PlayIcon } from '@/components/PlayIcon';

import { largeThumbnail, playerUrl, providerLabel } from '@/lib/format';
import { PLAY_EVENT } from '@/lib/player';

interface Props {
  embedUrl: string;
  provider: string;
  title: string;
  posterUrl: string | null;
  /** Adresse de la vidéo chez le fournisseur : lien suivi sans JavaScript. */
  sourceUrl: string;
  /** Moment de départ (citation, `?t=` dans l'adresse). */
  startS?: number | undefined;
}

/**
 * Lecteur intégré (spec intervention-media) : iframe isolée, chargée depuis l'origine du
 * fournisseur. Aucun HTML tiers n'est injecté dans la page.
 */
function MediaEmbed({ embedUrl, title }: { embedUrl: string; title: string }) {
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl">
      <iframe
        src={embedUrl}
        title={title}
        sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        className="absolute inset-0 h-full w-full border-0"
      />
    </div>
  );
}

/**
 * Clic pour charger (spec intervention-media, ADR 0022) : aucun lecteur tiers, donc aucun
 * cookie du fournisseur, avant l'action du visiteur ; ensuite, le lecteur démarre aussitôt.
 * Sans JavaScript, l'affiche est un lien vers la vidéo chez le fournisseur.
 */
export default function PlayerConsent(props: Props) {
  const [accepted, setAccepted] = useState(false);
  const [start, setStart] = useState(props.startS);
  // Demande d'écouter un passage : ce geste vaut consentement, la mention des cookies
  // figurant à côté du bouton (ADR 0022). Chaque demande relance le lecteur au passage.
  const [request, setRequest] = useState(0);
  useEffect(() => {
    const onPlay = (event: Event) => {
      setStart((event as CustomEvent<number>).detail);
      setRequest((n) => n + 1);
      setAccepted(true);
    };
    window.addEventListener(PLAY_EVENT, onPlay);
    return () => window.removeEventListener(PLAY_EVENT, onPlay);
  }, []);
  if (accepted) {
    const url = playerUrl(props.embedUrl, start);
    return <MediaEmbed key={`${url}#${request}`} embedUrl={url} title={props.title} />;
  }
  const name = providerLabel(props.provider);
  return (
    <a
      href={props.sourceUrl}
      target="_blank"
      rel="noopener"
      aria-label={`Lire la vidéo sur ${name}`}
      onClick={(event) => {
        event.preventDefault();
        setAccepted(true);
      }}
      className="relative flex aspect-video w-full flex-col overflow-hidden rounded-xl bg-bleu-sombre"
    >
      {props.posterUrl ? (
        <img
          src={largeThumbnail(props.posterUrl)}
          data-fallback={props.posterUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : null}
      {/* Voile bleu nuit : bouton et mention restent lisibles quelle que soit la miniature. */}
      <span className="absolute inset-0 bg-bleu-sombre/55" />
      <span className="relative flex flex-1 items-center justify-center p-4">
        <span className="flex items-center gap-2 rounded-full bg-chamois px-5 py-2.5 font-sans-bold text-base text-bleu-sombre">
          <PlayIcon /> Lire la vidéo
        </span>
      </span>
      <span className="relative bg-bleu-sombre/85 px-4 py-2 text-center font-sans text-blanc/85 text-xs leading-snug">
        La vidéo se charge depuis {name}, qui peut alors déposer des cookies.
      </span>
    </a>
  );
}
