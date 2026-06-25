const CACHE_NAME = 'studio313-v2'
const SHELL_ASSETS = ['/', '/index.html', '/manifest.json', '/favicon.png', '/icon.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS))
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

  const url = new URL(event.request.url)
  const isApi = url.pathname.startsWith('/api/')
  const isNavigate = event.request.mode === 'navigate'
  const isAsset = url.pathname.startsWith('/assets/')

  if (isApi) return

  // HTML-страницы: network-first, чтобы после деплоя сразу получать свежий index.html
  if (isNavigate || url.pathname === '/index.html') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', clone))
          return response
        })
        .catch(() => caches.match('/index.html'))
    )
    return
  }

  // JS/CSS/шрифты/иконки: cache-first, затем обновляем кэш в фоне
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
          }
          return networkResponse
        })
        .catch(() => cached)

      return cached || fetchPromise
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
