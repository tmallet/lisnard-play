import type { PushClient, PushRegistration } from './push-types';

/** Clé VAPID publique (base64url) vers les octets attendus par PushManager. */
export function decodeVapidKey(key: string): Uint8Array<ArrayBuffer> {
  const base64 = (key + '='.repeat((4 - (key.length % 4)) % 4))
    .replaceAll('-', '+')
    .replaceAll('_', '/');
  const raw = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

function toRegistration(sub: PushSubscription): PushRegistration | null {
  const json = sub.toJSON();
  const { p256dh, auth } = json.keys ?? {};
  if (!json.endpoint || !p256dh || !auth) return null;
  return { kind: 'web', endpoint: json.endpoint, keys: { p256dh, auth } };
}

/** iPhone et iPad (y compris iPadOS, qui se présente comme un Mac tactile). */
function isAppleMobile(): boolean {
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

const standalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

async function registration() {
  return navigator.serviceWorker?.getRegistration('/');
}

/** Web Push standard (ADR 0024) : service worker `/sw.js` et clé VAPID du serveur. */
export const pushClient: PushClient = {
  support(vapidPublicKey) {
    if (typeof window === 'undefined') return 'unsupported';
    // Sur iPhone, Web Push n'existe que pour un site ajouté à l'écran d'accueil.
    if (isAppleMobile() && !standalone()) return 'needs-install';
    if (
      !('serviceWorker' in navigator) ||
      !('PushManager' in window) ||
      !('Notification' in window)
    )
      return 'unsupported';
    return vapidPublicKey ? 'supported' : 'unconfigured';
  },

  async current() {
    const sub = await (await registration())?.pushManager.getSubscription();
    return sub ? toRegistration(sub) : null;
  },

  async register(vapidPublicKey) {
    if (!vapidPublicKey) throw new Error('Clé VAPID absente');
    if ((await Notification.requestPermission()) !== 'granted') return 'denied';
    await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    const reg = await navigator.serviceWorker.ready;
    const sub =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: decodeVapidKey(vapidPublicKey),
      }));
    const result = toRegistration(sub);
    if (!result) throw new Error('Abonnement Web Push incomplet');
    return result;
  },

  blocked() {
    return typeof Notification !== 'undefined' && Notification.permission === 'denied';
  },

  async unregister() {
    await (await (await registration())?.pushManager.getSubscription())?.unsubscribe();
  },
};
