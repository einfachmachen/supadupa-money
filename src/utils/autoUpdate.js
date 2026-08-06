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
const TAKT_MS = 180000;        // alle 3 Minuten prüfen, solange die App sichtbar ist

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

  // ── Schutz vor Reload-Schleifen ───────────────────────────────────────
  // Wichtiger geworden, seit im Vordergrund getaktet geprüft wird: liefert das
  // CDN kurz nach einem Deploy schon die neue version.json, aber noch die alte
  // index.html, sähe die App nach dem Neuladen unverändert eine Abweichung —
  // und lüde alle drei Minuten erneut. Deshalb zusätzlich zum Zeitabstand ein
  // Zähler pro Server-Build: nach zwei erfolglosen Versuchen für DIESELBE
  // Build-ID wird es aufgegeben, bis eine andere ID erscheint.
  const now = Date.now();
  const last = Number(sessionStorage.getItem("sdm_last_reload") || 0);
  if (now - last < RELOAD_GUARD_MS) return;

  let versuche = 0;
  try {
    const roh = JSON.parse(sessionStorage.getItem("sdm_reload_fuer") || "null");
    if (roh && roh.id === server) versuche = Number(roh.n) || 0;
  } catch (_) { /* egal */ }
  if (versuche >= 2) return;

  sessionStorage.setItem("sdm_last_reload", String(now));
  sessionStorage.setItem("sdm_reload_fuer", JSON.stringify({ id: server, n: versuche + 1 }));

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

  // Takt nur im Vordergrund: im Hintergrund drosseln die Browser Timer
  // ohnehin, und eine unsichtbare App muss nicht nach Updates fragen.
  // version.json ist ein paar Dutzend Byte, alle 3 Minuten fällt damit
  // praktisch kein Datenvolumen an.
  let taktId = null;
  const starteTakt = () => {
    if (taktId != null) return;
    taktId = setInterval(checkForUpdate, TAKT_MS);
  };
  const stoppeTakt = () => {
    if (taktId == null) return;
    clearInterval(taktId); taktId = null;
  };
  if (document.visibilityState === "visible") starteTakt();

  // ── Auslöser ──────────────────────────────────────────────────────────
  // visibilitychange und focus allein reichen auf dem iPhone nicht: eine
  // installierte PWA bleibt beim Wechsel in den Hintergrund oft am Leben, und
  // beim Zurückholen feuert keins von beiden zuverlässig. Die App lief dann
  // stundenlang mit dem Build weiter, mit dem sie gestartet war (Nutzer-
  // Bericht: neue Stände kamen erst nach dem Wischen aus dem App-Umschalter
  // an). Deshalb zusätzlich pageshow — das feuert auf iOS auch, wenn die
  // Seite aus dem Back-Forward-Cache zurückkommt — und ein Takt im
  // Vordergrund, der jeden anderen Weg auffängt.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") { checkForUpdate(); starteTakt(); }
    else stoppeTakt();
  });
  window.addEventListener("focus", checkForUpdate);
  window.addEventListener("pageshow", checkForUpdate);
  window.addEventListener("online", checkForUpdate);

  // Registrierten Service Worker zusätzlich nach Updates suchen lassen.
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistration()
      .then(reg => { if (reg) reg.update().catch(() => {}); })
      .catch(() => {});
  }
}
