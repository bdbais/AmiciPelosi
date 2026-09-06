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

/*
 * Dove porta la notifica: solo pagine nostre. Il payload arriva cifrato e
 * firmato, ma se un giorno la chiave privata gira, una notifica non deve
 * poter mandare qualcuno su un sito che non e' il nostro.
 */
function safeTarget(url) {
  try {
    const target = new URL(url || '/', self.location.origin)
    return target.origin === self.location.origin ? target.href : self.location.origin + '/'
  } catch {
    return self.location.origin + '/'
  }
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = safeTarget(event.notification.data && event.notification.data.url)

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Riusa una finestra gia aperta invece di aprirne una nuova. navigate()
      // puo' fallire (finestra su un'altra origine, browser che non lo
      // permette): allora se ne apre una nuova, che e' quello che si voleva.
      const client = clientList.find((c) => 'navigate' in c && 'focus' in c)
      if (!client) return self.clients.openWindow(target)
      return client
        .navigate(target)
        .then((navigated) => (navigated ? navigated.focus() : self.clients.openWindow(target)))
        .catch(() => self.clients.openWindow(target))
    }),
  )
})

/*
 * Il browser ogni tanto cambia l'iscrizione da solo (scade, o il servizio
 * push la rinnova). Senza questo passaggio il telefono resta iscritto a un
 * indirizzo che il server non conosce piu', e non suona piu' niente senza che
 * nessuno se ne accorga.
 */
self.addEventListener('pushsubscriptionchange', (event) => {
  const previous = event.oldSubscription
  const applicationServerKey =
    (event.newSubscription && event.newSubscription.options.applicationServerKey) ||
    (previous && previous.options.applicationServerKey)
  if (!applicationServerKey) return

  event.waitUntil(
    self.registration.pushManager
      .subscribe({ userVisibleOnly: true, applicationServerKey })
      .then((subscription) =>
        fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subscription.toJSON()),
        }),
      )
      .catch(() => undefined),
  )
})
