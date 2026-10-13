import { Slot } from 'expo-router';

import { WebChrome } from './WebChrome';

/** Web : les onglets deviennent l'en-tête de WebChrome ; le contenu s'affiche dessous. */
export function AppNavigation() {
  return (
    <WebChrome>
      <Slot />
    </WebChrome>
  );
}
