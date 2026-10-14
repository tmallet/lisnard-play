import { focusManager } from '@tanstack/react-query';
import { AppState, type AppStateStatus, Platform } from 'react-native';

/**
 * Retour au premier plan sur mobile (spec intervention-feed) : TanStack Query écoute la
 * visibilité de la fenêtre sur le web, mais pas l'état de l'app native. On relie donc son
 * gestionnaire de focus à `AppState` : les requêtes actives sont rafraîchies au retour.
 */
export function bindAppStateFocus(): void {
  if (Platform.OS === 'web') return;
  focusManager.setEventListener((setFocused) => {
    const subscription = AppState.addEventListener('change', (status: AppStateStatus) =>
      setFocused(status === 'active'),
    );
    return () => subscription.remove();
  });
}
