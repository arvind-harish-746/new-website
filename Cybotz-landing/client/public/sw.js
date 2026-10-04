// Cybotz Service Worker — Offline Fallback
const CACHE_NAME = "cybotz-offline-v7";
const OFFLINE_URL = "/offline.html";

// Install: cache the offline fallback page with fresh reload
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        new Request(OFFLINE_URL, { cache: "reload" }),
        new Request(OFFLINE_URL + "?v=7", { cache: "reload" })
      ]);
    })
  );
  // Activate immediately without waiting
  self.skipWaiting();
});

// Activate: clean up all older caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  // Take control of all clients immediately
  self.clients.claim();
});

// Fetch: serve offline page when navigation requests fail
self.addEventListener("fetch", (event) => {
  // Intercept navigation requests (HTML page loads)
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(OFFLINE_URL).then((res) => {
          return res || caches.match(OFFLINE_URL + "?v=7");
        });
      })
    );
  }
});
