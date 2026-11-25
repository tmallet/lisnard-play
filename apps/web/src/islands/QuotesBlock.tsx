import { useState } from 'react';
import { PlayIcon } from '@/components/PlayIcon';

import { ShareImageButton, ShareLinkButton, ShareXLink } from '@/components/ShareButtons';
import { formatTimestamp, THEME_LABELS, type Theme } from '@/lib/format';
import { requestPlay } from '@/lib/player';
import { quotePath } from '@/lib/site';

export interface QuoteItem {
  text: string;
  startS: number;
  theme: string | null;
}

interface Props {
  itemId: string;
  title: string;
  quotes: QuoteItem[];
  origin: string;
}

const link = 'flex min-h-10 items-center font-sans-semibold text-chamois text-sm underline';

/**
 * Citations horodatées d'une vidéo (spec intervention-quotes, ADR 0028) : chaque citation
 * lance le lecteur officiel à son moment, a sa page et se partage. Transcription
 * automatique, signalée. Sans JavaScript, chaque action mène à la page de la citation.
 */
export default function QuotesBlock({ itemId, title, quotes, origin }: Props) {
  // Citation dont les options de partage sont dépliées.
  const [sharing, setSharing] = useState<number | null>(null);
  if (quotes.length === 0) return null;
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-sans-semibold text-chamois text-xs uppercase tracking-wider">
        Citations
      </h2>
      {quotes.map((quote) => {
        const path = quotePath(itemId, quote.startS);
        const time = formatTimestamp(quote.startS);
        return (
          <figure
            key={quote.startS}
            className="flex flex-col gap-2 rounded-r-2xl border-chamois border-l-2 bg-blanc/5 py-3 pr-4 pl-4"
          >
            <blockquote className="font-sans-bold text-base text-blanc leading-snug md:text-lg">
              « {quote.text} »
            </blockquote>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <a
                href={`?t=${quote.startS}`}
                aria-label={`Écouter le passage à ${time}`}
                onClick={(event) => {
                  event.preventDefault();
                  requestPlay(quote.startS);
                }}
                className="flex min-h-10 items-center rounded-full bg-chamois px-4 font-sans-bold text-bleu-sombre text-sm transition-opacity duration-200 active:opacity-80 motion-reduce:transition-none"
              >
                <PlayIcon /> {time}
              </a>
              <a href={path} className={link}>
                Voir la citation
              </a>
              {/* Partages regroupés : une seule entrée, qui déplie lien, image et X. Sans
                  JavaScript, la page de la citation (lien ci-dessus) propose les partages. */}
              <button
                type="button"
                aria-expanded={sharing === quote.startS}
                aria-label={`Partager la citation à ${time}`}
                onClick={() => setSharing(sharing === quote.startS ? null : quote.startS)}
                className="hidden min-h-10 items-center font-sans-semibold text-chamois text-sm underline js:flex"
              >
                Partager
              </button>
              {quote.theme && quote.theme in THEME_LABELS ? (
                <span className="font-sans text-blanc/70 text-xs">
                  {THEME_LABELS[quote.theme as Theme]}
                </span>
              ) : null}
            </div>
            {sharing === quote.startS ? (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <ShareLinkButton path={path} title={title} label="Lien" />
                <ShareImageButton itemId={itemId} startS={quote.startS} label="Image" />
                <ShareXLink
                  itemId={itemId}
                  startS={quote.startS}
                  text={quote.text}
                  origin={origin}
                  label="X"
                />
              </div>
            ) : null}
          </figure>
        );
      })}
      <p className="font-sans text-blanc/60 text-xs">
        Transcription automatique : écoutez le passage pour vérifier. La vidéo se charge depuis
        YouTube, qui peut alors déposer des cookies.
      </p>
    </section>
  );
}
