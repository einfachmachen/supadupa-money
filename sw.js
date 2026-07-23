// build: 1784765101884
// Service Worker — "network-first" für Seiten-Navigationen, damit IMMER die
// frische index.html geladen wird (verhindert den alten Ladebildschirm aus dem
// Cache). Offline gibt es einen Fallback auf die zuletzt gesehene Version.
//
// JS/CSS/Icons sind content-gehasht (Vite-Build) → hier zusätzlich explizit
// "cache-first" gecacht, statt sich auf den normalen HTTP-Cache des Browsers
// zu verlassen: der kann Einträge jederzeit verdrängen (Speicherdruck, lange
// Inaktivität), was bei schlechter/fehlender Verbindung (Nutzer hat oft kein
// Netz) dazu führen kann, dass die App gar nicht mehr startet. Da jede Datei
// pro Inhalt genau eine (gehashte) URL hat, ist cache-first hier gefahrlos —
// es gibt nie eine "veraltete" Version unter derselben URL.
const CACHE = "supadupa-money-v6";

self.addEventListener("install", e => {
  self.skipWaiting(); // neue Version sofort übernehmen
});

self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    // ALLE Caches leeren (nicht nur fremde) — entfernt jede veraltete, im SW
    // gecachte index.html, die auf nicht mehr existierende JS-Chunks zeigt.
    const keys = await caches.keys();
    await Promise.all(keys.map(k => caches.delete(k)));
    await self.clients.claim();
    // WICHTIG: hier bewusst KEIN erzwungenes clients.matchAll()+c.navigate()
    // mehr (früher hier, um offene Tabs sofort auf die neue Version zu holen).
    // Das führte auf einer brandneuen Installation zu einem Deadlock: activate()
    // ruft clients.claim() auf und übernimmt damit sofort die Kontrolle über den
    // Tab, der die Registrierung gerade erst ausgelöst hat — der anschließende
    // c.navigate(c.url) muss als "navigate"-Request über GENAU DIESEN Service
    // Worker laufen (network-first, siehe fetch-Handler unten), der aber erst
    // als aktiviert gilt, wenn dieses waitUntil()-Promise selbst fertig ist —
    // und das wartet ja gerade auf die Navigation. Zirkuläres Warten → die
    // Seite hängt dauerhaft in einem nie abschließenden Ladevorgang (nur bei
    // der allerersten Registrierung reproduzierbar, da bei jedem späteren
    // Besuch schon ein aktiver, kontrollierender SW vorhanden ist und activate
    // nie erneut feuert). Der erzwungene Sofort-Reload war ohnehin redundant:
    // die nächste normale Navigation läuft schon über den frischen SW, und
    // autoUpdate.js löst bei neuem Build selbst schon einen echten
    // Seiten-Reload aus (von der Seite selbst, nicht vom SW aus).
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

  // Gehashte Build-Assets (JS/CSS unter /assets/) sowie Icon/Manifest: fest
  // im Cache halten, cache-first mit Hintergrund-Auffrischung (stale-while-
  // revalidate) — so bleibt die App auch nach langer Offline-Zeit startklar,
  // sobald sie einmal online geladen wurde.
  if (req.method === "GET" && new URL(req.url).origin === self.location.origin) {
    const isAsset = /\/assets\//.test(req.url) || /\.(?:js|css|svg|png|jpg|jpeg|webp)$/.test(new URL(req.url).pathname);
    if (isAsset) {
      e.respondWith((async () => {
        const cache = await caches.open(CACHE);
        const cached = await cache.match(req);
        const network = fetch(req).then(res => {
          if (res && res.ok) cache.put(req, res.clone());
          return res;
        }).catch(() => null);
        return cached || (await network) || Response.error();
      })());
    }
  }
  // alles andere: Pass-through (Browser-/HTTP-Cache)
});
