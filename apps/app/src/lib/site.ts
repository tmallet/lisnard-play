import { Platform } from 'react-native';

/** Adresse publique du site : origine de la page sur le web, configurée sur mobile. */
export const SITE_URL = process.env.EXPO_PUBLIC_SITE_URL ?? 'https://lisnardplay.thimal.fr';

export function siteOrigin(): string {
  return Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : SITE_URL;
}

/** Adresse de la page d'une citation (spec intervention-quotes, ADR 0028). */
export const quotePath = (itemId: string, startS: number) =>
  `/interventions/${itemId}/citation/${startS}`;

/** Même page, sous forme de lien typé pour expo-router. */
export const quoteHref = (itemId: string, startS: number) => ({
  pathname: '/interventions/[id]/citation/[t]' as const,
  params: { id: itemId, t: String(startS) },
});
