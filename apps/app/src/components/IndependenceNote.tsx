import { Text, View } from 'react-native';

import { INDEPENDENCE_NOTICE } from '@/config/app';

import { LegalLink } from './LegalLink';

/**
 * Mention d'indépendance en tête de contenu, en petit (web sur téléphone) : visible dès
 * l'ouverture sans interaction (spec app-shell, ADR 0001), alors que le pied de page
 * complet passe en fin de défilement pour laisser la place au contenu.
 */
export function IndependenceNote() {
  return (
    <View className="flex-row flex-wrap items-baseline gap-x-3">
      <Text className="font-sans text-blanc/70 text-xs leading-snug">{INDEPENDENCE_NOTICE}</Text>
      <LegalLink small />
    </View>
  );
}
