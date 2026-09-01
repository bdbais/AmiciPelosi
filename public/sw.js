/* Service worker di Amici Pelosi: riceve le notifiche di prossimita. */

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('push', (event) => {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch {
    payload = { title: 'Amici Pelosi', body: event.data ? event.data.text() : '' }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || '🐾 Amici Pelosi', {
      body: payload.body || 'Nuovo annuncio nella tua zona',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: payload.tag || 'amici-pelosi',
      data: { url: payload.url || '/' },
      vibrate: [120, 60, 120],
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = new URL(event.notification.data?.url || '/', self.location.origin).href

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Riusa una finestra gia aperta invece di aprirne una nuova.
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(target)
          return client.focus()
        }
      }
      return self.clients.openWindow(target)
    }),
  )
})
