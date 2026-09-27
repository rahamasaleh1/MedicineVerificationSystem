// Bump the version when any of these files change so users get the update
const CACHE_NAME = "medverify-v3";

const APP_FILES = [
  "./",
  "index.html",
  "style.css",
  "app.js",
  "medicines.csv",
  "manifest.json",
  "lib/html5-qrcode.min.js",
  "icons/icon-192.png",
  "icons/icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_FILES))
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Register data: try the network first so it stays up to date, fall back to cache offline.
// Everything else: cache first, since it only changes when CACHE_NAME is bumped.
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  if (url.pathname.endsWith("medicines.csv")) {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request, { ignoreSearch: url.origin === location.origin }).then(cached => {
      return cached || fetch(event.request).then(res => {
        // Cache the Google Fonts files too so the typeface works offline
        if (url.hostname.includes("fonts.g")) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        }
        return res;
      });
    })
  );
});
