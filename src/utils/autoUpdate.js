/* global __BUILD_ID__ */
// Automatischer Versions-Check: erkennt einen neuen Deploy und lädt die App
// genau einmal neu. Notwendig, weil installierte iOS-PWAs die alte Version
// hartnäckig aus dem Cache halten — ein simples "App öffnen" löst dort oft gar
// keinen frischen Seitenaufruf aus, sodass neue Deploys nicht ankommen.
//
// Funktionsweise: Beim Build wird dieselbe BUILD_ID ins Bundle injiziert
// (__BUILD_ID__) UND als version.json ausgeliefert. Die laufende App holt
// version.json ungecacht und vergleicht. Weichen die IDs ab, ist ein neuer
// Build live → location.reload() holt index.html + neue (gehashte) Bundles.

const BUILD_ID = typeof __BUILD_ID__ !== "undefined" ? __BUILD_ID__ : "dev";
const RELOAD_GUARD_MS = 30000; // höchstens alle 30 s ein automatischer Reload

async function fetchServerBuildId() {
  try {
    const base = (import.meta.env && import.meta.env.BASE_URL) || "/";
    const res = await fetch(`${base}version.json?ts=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    return data && data.buildId ? String(data.buildId) : null;
  } catch (_) {
    return null;
  }
}

async function checkForUpdate() {
  if (BUILD_ID === "dev") return; // im Dev-Server nie automatisch neu laden
  const server = await fetchServerBuildId();
  if (!server || server === BUILD_ID) return;

  // Reload-Schleifen verhindern (z. B. falls version.json kurz nach einem Deploy
  // noch nicht zur ausgelieferten index.html passt).
  const now = Date.now();
  const last = Number(sessionStorage.getItem("sdm_last_reload") || 0);
  if (now - last < RELOAD_GUARD_MS) return;
  sessionStorage.setItem("sdm_last_reload", String(now));

  // Service-Worker-Cache der Navigation vorsichtshalber leeren, dann neu laden.
  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }
  } catch (_) { /* egal */ }
  window.location.reload();
}

export function startAutoUpdate() {
  // Kurz nach dem Start (erster Render hat Vorrang).
  setTimeout(checkForUpdate, 3000);
  // Jedes Mal, wenn die PWA aus dem Hintergrund in den Vordergrund kommt.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") checkForUpdate();
  });
  window.addEventListener("focus", checkForUpdate);
  // Registrierten Service Worker zusätzlich nach Updates suchen lassen.
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistration()
      .then(reg => { if (reg) reg.update().catch(() => {}); })
      .catch(() => {});
  }
}
