import { formatTimestamp } from '@/lib/format';
import { quotePath, siteOrigin } from '@/lib/site';
import { xShareText } from '@/lib/x-share';

import { XPublishButton } from './XPublishButton';

/**
 * « Partager sur X » (spec intervention-quotes, ADR 0030) : rédaction X pré-remplie
 * avec la citation et le lien de sa page.
 */
export function ShareXButton({
  itemId,
  startS,
  text,
  label = 'Partager sur X',
}: {
  itemId: string;
  startS: number;
  text: string;
  label?: string;
}) {
  return (
    <XPublishButton
      text={xShareText(text)}
      url={`${siteOrigin()}${quotePath(itemId, startS)}`}
      label={label}
      accessibilityLabel={`Partager sur X la citation à ${formatTimestamp(startS)}`}
    />
  );
}
