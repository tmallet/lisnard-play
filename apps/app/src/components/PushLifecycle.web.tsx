import { usePushConfirmation } from './usePushConfirmation';

/** Web : le service worker ouvre lui-même l'intervention au clic (public/sw.js). */
export function PushLifecycle() {
  usePushConfirmation();
  return null;
}
