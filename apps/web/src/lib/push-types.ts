/** Contrat du client de notification web (spec push-notifications, ADR 0024). */

/**
 * - `supported` : le navigateur peut s'abonner ;
 * - `needs-install` : iPhone ou iPad dans Safari, le site doit d'abord être ajouté à
 *   l'écran d'accueil ;
 * - `unsupported` : navigateur sans Web Push ;
 * - `unconfigured` : service non configuré (clé VAPID absente).
 */
export type PushSupport = 'supported' | 'needs-install' | 'unsupported' | 'unconfigured';

export interface PushRegistration {
  kind: 'web';
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export interface PushClient {
  support(vapidPublicKey: string | null): PushSupport;
  /** Abonnement déjà présent dans le navigateur, sans rien demander à l'utilisateur. */
  current(): Promise<PushRegistration | null>;
  /** Demande l'autorisation puis abonne le navigateur ; `denied` si l'utilisateur refuse. */
  register(vapidPublicKey: string | null): Promise<PushRegistration | 'denied'>;
  unregister(): Promise<void>;
  /** L'utilisateur a déjà refusé l'autorisation : inutile de l'inviter à s'abonner. */
  blocked(): boolean;
}
