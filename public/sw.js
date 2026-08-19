// Bump this on any change to the caching strategy — activate() drops every other cache.
const CACHE_NAME = 'ndf-v2'
const APP_SHELL = '/index.html'

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.add(APP_SHELL))
      .catch(() => {})
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return

  let url
  try { url = new URL(req.url) } catch { return }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return

  // Navigations: network first. Serving the HTML shell from cache means a new
  // deploy is never picked up — the cached document keeps pointing at the old
  // hashed bundles. Fall back to cache only when actually offline.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE_NAME).then((c) => c.put(APP_SHELL, copy)).catch(() => {})
          return res
        })
        .catch(() => caches.match(APP_SHELL).then((cached) => cached || Response.error()))
    )
    return
  }

  // Everything else (hashed bundles, fonts, icons) is immutable per URL:
  // serve from cache, refresh in the background.
  e.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          // Opaque responses have status 0 and can silently fill the quota.
          if (res.ok && res.type !== 'opaque') {
            const copy = res.clone()
            caches.open(CACHE_NAME).then((c) => c.put(req, copy)).catch(() => {})
          }
          return res
        })
        .catch(() => cached)
      return cached || network
    })
  )
})
