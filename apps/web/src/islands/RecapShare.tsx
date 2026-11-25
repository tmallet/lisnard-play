import { ShareLinkButton, XLink } from '@/components/ShareButtons';
import { type RecapPeriod, recapPath, recapShareText } from '@/lib/recap';

/**
 * « Publier sur X » et « Partager » d'un récapitulatif (spec campaign-recaps). Sans
 * JavaScript, « Partager » est un lien vers le récapitulatif.
 */
export default function RecapShare(props: {
  period: RecapPeriod;
  from: string;
  to: string;
  count: number;
  delta: number | null;
  origin: string;
}) {
  const path = recapPath(props.period, props.from);
  const text = recapShareText(props.period, props.from, props.to, props.count, props.delta);
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      <XLink text={text} url={`${props.origin}${path}`} label="Publier sur X" />
      <ShareLinkButton path={path} title={text} label="Partager" />
    </div>
  );
}
