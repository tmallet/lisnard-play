import { PlayIcon } from '@/components/PlayIcon';
import { ShareImageButton, ShareLinkButton, ShareXLink } from '@/components/ShareButtons';
import { requestPlay } from '@/lib/player';
import { quotePath } from '@/lib/site';

interface Props {
  itemId: string;
  startS: number;
  text: string;
  title: string;
  origin: string;
  /** La vidéo est intégrable : « Écouter le passage » lance le lecteur de la page. */
  playable: boolean;
}

const link = 'font-sans-semibold text-chamois text-sm underline';

/**
 * Actions de la page d'une citation (spec intervention-quotes) : écouter le passage,
 * partager le lien, l'image ou sur X, voir l'intervention. Toutes sont des liens qui
 * fonctionnent sans JavaScript.
 */
export default function QuoteActions({ itemId, startS, text, title, origin, playable }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
      {playable ? (
        <a
          href={`/interventions/${itemId}?t=${startS}`}
          onClick={(event) => {
            event.preventDefault();
            requestPlay(startS);
          }}
          className="rounded-full bg-chamois px-4 py-1.5 font-sans-bold text-bleu-sombre text-sm active:opacity-80"
        >
          <PlayIcon /> Écouter le passage
        </a>
      ) : null}
      <ShareLinkButton
        path={quotePath(itemId, startS)}
        title={title}
        label="Partager la citation"
      />
      <ShareImageButton itemId={itemId} startS={startS} />
      <ShareXLink itemId={itemId} startS={startS} text={text} origin={origin} />
      <a href={`/interventions/${itemId}`} className={link}>
        Voir l’intervention complète
      </a>
    </div>
  );
}
