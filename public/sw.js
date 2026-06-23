// Service Worker — "network-first" für Seiten-Navigationen, damit IMMER die
// frische index.html geladen wird (verhindert den alten Ladebildschirm aus dem
// Cache). Offline gibt es einen Fallback auf die zuletzt gesehene Version.
// JS/CSS sind content-gehasht und laufen über den normalen Browser-Cache.
const CACHE = "supadupa-money-v4";

self.addEventListener("install", e => {
  self.skipWaiting(); // neue Version sofort übernehmen
});

self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    // alte Caches aufräumen
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", e => {
  const req = e.request;
  // Nur Seiten-Navigationen (index.html) behandeln — network-first.
  if (req.mode === "navigate") {
    e.respondWith((async () => {
      try {
        // cache:"reload" → HTTP-/Edge-Cache umgehen, IMMER frische index.html holen.
        // Verhindert veraltete Shells, die auf nicht mehr existierende JS-Chunks
        // zeigen (Symptom: ewiger Ladescreen).
        const res = await fetch(req, { cache: "reload" });
        try { const c = await caches.open(CACHE); await c.put(req, res.clone()); } catch (_) {}
        return res;
      } catch (_) {
        const cached = await caches.match(req);
        return cached || (await caches.match("./")) || Response.error();
      }
    })());
    return;
  }
  // alles andere: Pass-through (Browser-/HTTP-Cache, Assets sind content-hashed)
});
