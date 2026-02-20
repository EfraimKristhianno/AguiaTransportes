// Service Worker for Web Push Notifications (VAPID)
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
    tag: data.tag || 'aguia-notification',
    renotify: true,
    requireInteraction: true,
    data: data.data || {},
    vibrate: [200, 100, 200],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = self.location.origin + '/motoristas';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow(urlToOpen);
    })
  );
});
