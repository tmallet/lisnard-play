/** Contrat commun des clients de notification web et mobile (spec push-notifications). */

/**
 * - `supported` : l'appareil peut s'abonner ;
 * - `needs-install` : iPhone ou iPad dans Safari, le site doit d'abord être ajouté à
 *   l'écran d'accueil ;
 * - `unsupported` : navigateur sans Web Push ;
 * - `unconfigured` : service non configuré (clé VAPID absente, pas de projet EAS,
 *   simulateur).
 */
export type PushSupport = 'supported' | 'needs-install' | 'unsupported' | 'unconfigured';

export type PushRegistration =
  | { kind: 'web'; endpoint: string; keys: { p256dh: string; auth: string } }
  | { kind: 'expo'; endpoint: string };

export interface PushClient {
  support(vapidPublicKey: string | null): PushSupport;
  /** Abonnement déjà présent sur l'appareil, sans rien demander à l'utilisateur. */
  current(): Promise<PushRegistration | null>;
  /** Demande l'autorisation puis abonne l'appareil ; `denied` si l'utilisateur refuse. */
  register(vapidPublicKey: string | null): Promise<PushRegistration | 'denied'>;
  unregister(): Promise<void>;
  /** L'utilisateur a déjà refusé l'autorisation : inutile de l'inviter à s'abonner. */
  blocked(): boolean;
}
