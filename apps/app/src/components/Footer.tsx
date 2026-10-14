import { Text, View } from 'react-native';

import { INDEPENDENCE_NOTICE } from '@/config/app';

import { LegalLink } from './LegalLink';

/**
 * Mention d'indépendance (ADR 0001) et lien vers les mentions légales (ADR 0022). `inset` ajoute la marge latérale quand le pied
 * de page est hors d'un `Screen` (pied de page global du web).
 */
export function Footer({ inset = false }: { inset?: boolean }) {
  return (
    <View
      role="contentinfo"
      className={`gap-2 border-blanc/15 border-t py-5 ${inset ? 'px-6' : ''}`}
    >
      <Text className="font-sans text-blanc/70 text-sm">{INDEPENDENCE_NOTICE}</Text>
      <LegalLink />
    </View>
  );
}
