// Entscheidet, ob und welcher Sync-Status-Hinweis angezeigt wird (Offline-
// Badge / "nicht synchronisiert" / Sync-Fehler). Reine Funktion, damit sie
// ohne React-Rendering testbar ist — die Anzeige-Logik selbst lebt in
// SyncStatusBadge.jsx.
function getSyncBadgeState({ isOnline, cfActive, isDirty, syncStatus }) {
  if (!isOnline) {
    return { key: "offline", text: "Offline – wird lokal gespeichert", tone: "blue" };
  }
  if (!cfActive) return null; // keine Cloud eingerichtet — nichts zu synchronisieren
  if (syncStatus === "saving") return { key: "saving", text: "Synchronisiert…", tone: "gold" };
  if (syncStatus === "saved") return { key: "saved", text: "Synchronisiert ✓", tone: "pos" };
  if (syncStatus === "error") return { key: "error", text: "Sync fehlgeschlagen – antippen zum Wiederholen", tone: "neg" };
  if (isDirty) return { key: "dirty", text: "Nicht synchronisiert", tone: "gold" };
  return null;
}

export { getSyncBadgeState };
