/*
 * Service worker des notifications web (spec push-notifications, ADR 0024).
 * Affiche les notifications envoyées par le worker et ouvre l'intervention au clic.
 * Aucun cache : le site reste servi par le serveur à chaque visite.
 */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  const title = data.title || 'Nouvelle intervention';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      tag: data.tag,
      renotify: Boolean(data.tag),
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      image: data.image,
      lang: 'fr',
      data: { url: data.url || '/' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || '/', self.location.origin);
  // Seules les pages du site sont ouvertes, jamais une adresse externe.
  if (target.origin !== self.location.origin) return;
  event.waitUntil(
    // Onglet du site contrôlé par ce service worker : on l'y emmène. navigate() échoue sur
    // un onglet non contrôlé : on ouvre alors une nouvelle fenêtre.
    self.clients
      .matchAll({ type: 'window' })
      .then((windows) => {
        const client = windows.find((c) => 'navigate' in c);
        if (!client) return self.clients.openWindow(target.href);
        return client.navigate(target.href).then((c) => (c || client).focus());
      })
      .catch(() => self.clients.openWindow(target.href)),
  );
});
