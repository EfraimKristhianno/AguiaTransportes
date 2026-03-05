// Service Worker for Web Push Notifications (VAPID)
// Optimized for background delivery on iOS (PWA 16.4+) and Android

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch (e) {
    data = { title: 'Águia Transportes', body: event.data.text() };
  }

  const title = data.title || '🚛 Nova solicitação!';
  const options = {
    body: data.body || data.message || '',
    icon: '/logo-192.png',
    badge: '/logo-192.png',
    // Unique tag with timestamp ensures each notification is shown separately
    // and prevents OS from collapsing/silencing repeated notifications
    tag: data.tag || ('aguia-' + Date.now()),
    // renotify: true forces the device to alert again even if a notification
    // with the same tag already exists (critical for sound on Android)
    renotify: true,
    // requireInteraction keeps the notification visible until the user interacts
    // (supported on Android, ignored on iOS)
    requireInteraction: true,
    data: data.data || {},
    // Vibration pattern for Android (ignored on iOS)
    vibrate: [300, 100, 300, 100, 300],
    // CRITICAL: silent MUST be false to ensure the notification plays sound
    // on both iOS and Android when the app is in the background
    silent: false,
    // Actions for Android notification (ignored on iOS)
    actions: [
      { action: 'open', title: 'Ver solicitação' },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = self.location.origin + '/motoristas';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Try to focus an existing window first
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      return clients.openWindow(urlToOpen);
    })
  );
});

// Keep the service worker alive - important for iOS background delivery
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('install', (event) => {
  self.skipWaiting();
});
