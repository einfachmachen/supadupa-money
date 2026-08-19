// Entscheidet, ob und welcher Sync-Status-Hinweis angezeigt wird (Offline-
// Badge / "nicht synchronisiert" / Sync-Fehler). Reine Funktion, damit sie
// ohne React-Rendering testbar ist — die Anzeige-Logik selbst lebt in
// SyncStatusBadge.jsx.
// Signalfarben — bewusst FEST und nicht aus dem Theme.
//
// Vorher trug das Badge den jeweiligen Theme-Ton als 13-%-Tönung. Über 34
// Themes hinweg ergab das mal Oliv, mal Senf, mal ein blasses Grün: „nicht
// Fisch, nicht Fleisch" (Nutzer-Wort). Eine Ampel muss überall dieselbe
// Ampel sein — deshalb hier vier klare Töne, volle Fläche, Schrift wird
// dagegen gerechnet (siehe SyncStatusBadge).
//
// Zusätzlich trägt jeder Zustand ein eigenes Symbol: Farbe allein darf die
// Aussage nicht tragen (Rot-Grün-Sehschwäche).
const AMPEL = {
  gruen: "#43A047",
  gelb:  "#FFC400",
  rot:   "#C62828",
  blau:  "#1565C0",
};

function getSyncBadgeState({ isOnline, cfActive, isDirty, syncStatus }) {
  if (!isOnline) {
    return { key: "offline", text: "Offline – wird lokal gespeichert", tone: "blue",
      signal: AMPEL.blau, icon: "wifi" };
  }
  if (!cfActive) return null; // keine Cloud eingerichtet — nichts zu synchronisieren
  if (syncStatus === "saving") return { key: "saving", text: "Synchronisiert…", tone: "gold",
    signal: AMPEL.gelb, icon: "refresh-cw" };
  if (syncStatus === "saved") return { key: "saved", text: "Synchronisiert ✓", tone: "pos",
    signal: AMPEL.gruen, icon: "check" };
  if (syncStatus === "error") return { key: "error", text: "Sync fehlgeschlagen – antippen zum Wiederholen", tone: "neg",
    signal: AMPEL.rot, icon: "alert-triangle" };
  // Ein anderes Gerät hat neuere Daten in die Cloud gespeichert, als hier
  // lokal vorliegen (Boot-Check vergleicht saved_at-Zeitstempel) — MUSS
  // sichtbar sein, sonst bemerkt der Nutzer nie, dass z.B. eine auf einem
  // anderen Gerät vorgenommene Verknüpfung/Änderung noch nicht angekommen ist.
  if (syncStatus === "cloud_newer") return { key: "cloud_newer", text: "Neuere Daten in der Cloud – zum Laden antippen", tone: "gold",
    signal: AMPEL.gelb, icon: "download-cloud" };
  if (isDirty) return { key: "dirty", text: "Nicht synchronisiert", tone: "gold",
    signal: AMPEL.gelb, icon: "upload-cloud" };
  return null;
}

export { getSyncBadgeState, AMPEL };
