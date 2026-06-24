const CACHE_NAME = 'studio313-v1'
const STATIC_ASSETS = ['/', '/index.html', '/manifest.json', '/favicon.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  const isApi = event.request.url.includes('/api/')
  const isNavigate = event.request.mode === 'navigate'

  if (isApi) return

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached
      return fetch(event.request).catch(() => {
        if (isNavigate) return caches.match('/index.html')
        return undefined
      })
    })
  )
})

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data?.json() || {}
  } catch {
    data = { title: 'Studio 313', message: event.data?.text() || '' }
  }

  const title = data.title || 'Studio 313'
  const options = {
    body: data.message || '',
    icon: '/icon.svg',
    badge: '/icon.svg',
    data: { link: data.link || '/' },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const link = event.notification.data?.link || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === link && 'focus' in client) {
          return client.focus()
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(link)
      }
    })
  )
})
