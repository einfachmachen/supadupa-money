// Minimaler PWA Service Worker
const CACHE = "mybudgettracker-v1";

self.addEventListener("install", e => {
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", e => {
  // Pass-through, kein offline-Cache
});
