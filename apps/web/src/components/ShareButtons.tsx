import { useEffect, useState } from 'react';

import { formatTimestamp } from '@/lib/format';
import { shareLink } from '@/lib/share';
import { shareImage } from '@/lib/share-image';
import { browserOrigin, quoteImagePath, quotePath } from '@/lib/site';
import { xIntentUrl, xShareText } from '@/lib/x-share';

const link = 'font-sans-semibold text-chamois text-sm underline';

/**
 * Partage d'un lien : feuille de partage ou copie. Sans JavaScript, un simple lien vers
 * la page partagée.
 */
export function ShareLinkButton({
  path,
  title,
  label,
}: {
  path: string;
  title: string;
  label: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <a
      href={path}
      className={link}
      onClick={async (event) => {
        event.preventDefault();
        setCopied((await shareLink(`${browserOrigin()}${path}`, title)) === 'copied');
      }}
    >
      {copied ? 'Lien copié' : label}
    </a>
  );
}

const IMAGE_MESSAGES = { downloaded: 'Image téléchargée', failed: 'Image indisponible' } as const;

/**
 * « Partager en image » (spec intervention-quotes, ADR 0029) : partage du navigateur avec
 * le fichier, sinon téléchargement. Sans JavaScript, un lien vers l'image.
 */
export function ShareImageButton({
  itemId,
  startS,
  label = 'Partager en image',
}: {
  itemId: string;
  startS: number;
  label?: string;
}) {
  const [state, setState] = useState<'idle' | 'busy' | keyof typeof IMAGE_MESSAGES>('idle');
  // Le message s'efface : le bouton redevient disponible pour un nouvel essai.
  useEffect(() => {
    if (state !== 'downloaded' && state !== 'failed') return;
    const timer = setTimeout(() => setState('idle'), 4000);
    return () => clearTimeout(timer);
  }, [state]);
  const fileName = `citation-david-lisnard-${startS}.png`;
  return (
    <a
      href={quoteImagePath(itemId, startS)}
      download={fileName}
      aria-label={`Partager en image la citation à ${formatTimestamp(startS)}`}
      aria-busy={state === 'busy'}
      className={link}
      onClick={async (event) => {
        event.preventDefault();
        if (state === 'busy') return;
        setState('busy');
        const result = await shareImage(quoteImagePath(itemId, startS), fileName);
        setState(result === 'downloaded' || result === 'failed' ? result : 'idle');
      }}
    >
      {state === 'busy' ? 'Préparation…' : state === 'idle' ? label : IMAGE_MESSAGES[state]}
    </a>
  );
}

/**
 * Rédaction X pré-remplie par l'adresse publique (ADR 0030) : aucun script de X sur le
 * site ; l'app X ouvre elle-même cette adresse sur téléphone.
 */
export function XLink({
  text,
  url,
  label,
  ariaLabel,
}: {
  text: string;
  url: string;
  label: string;
  ariaLabel?: string;
}) {
  return (
    <a
      href={xIntentUrl(text, url)}
      target="_blank"
      rel="noopener"
      aria-label={ariaLabel}
      className={link}
    >
      {label}
    </a>
  );
}

/** « Partager sur X » d'une citation : citation et lien de sa page (spec intervention-quotes). */
export function ShareXLink({
  itemId,
  startS,
  text,
  origin,
  label = 'Partager sur X',
}: {
  itemId: string;
  startS: number;
  text: string;
  /** Adresse publique du site (rendu serveur : jamais tirée de la requête). */
  origin: string;
  label?: string;
}) {
  return (
    <XLink
      text={xShareText(text)}
      url={`${origin}${quotePath(itemId, startS)}`}
      label={label}
      ariaLabel={`Partager sur X la citation à ${formatTimestamp(startS)}`}
    />
  );
}
