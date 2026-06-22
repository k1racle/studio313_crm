const CACHE_NAME = 'studio313-v1'
const STATIC_ASSETS = ['/', '/index.html', '/manifest.json', '/icon.svg']

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
