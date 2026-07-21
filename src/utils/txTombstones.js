// Tombstones für gelöschte Buchungen — verhindert, dass ein Cloud-Sync eine
// bereits gelöschte Buchung wieder aufleben lässt.
//
// Hintergrund: cfSave() schreibt Config und Buchungen pro Jahr als mehrere
// unabhängige PUT-Requests. Schlägt einer davon fehl (Netz-Hänger, Timeout),
// bleibt die Buchung für das betroffene Jahr in Cloudflare stehen, obwohl
// Config bereits einen neuen saved_at-Zeitstempel bekommen hat — die App
// hält den Cloud-Stand danach fälschlich für "neuer" und lädt beim
// bestätigten Nachladen (loadFromCloud) den alten, noch nicht bereinigten
// Buchungs-Datensatz zurück. Genauso kann ein zweites Gerät/Tab mit
// veraltetem lokalem Stand eine bereits gelöschte Buchung erneut hochladen.
//
// Fix: jede lokale Löschung wird hier mit Zeitstempel gemerkt und filtert
// beim Übernehmen von Cloud-/Lokal-Daten BEDINGUNGSLOS jede Buchung heraus,
// die als gelöscht vermerkt ist.
//
// FRÜHERE FASSUNG (Bug, monatelang Ursache für "gelöschte Buchung kommt
// nach jedem Laden zurück"): filterTombstonedTxs() verglich den Lösch-
// Zeitstempel gegen den saved_at des geladenen Snapshots und verwarf den
// Tombstone, sobald saved_at NEUER war — die Annahme war "dann wurde die
// Buchung wohl bewusst neu angelegt". saved_at ist aber ein GLOBALER
// Zeitstempel für die gesamte Config (Themes, Budgets, alles) und rückt bei
// JEDER Kleinigkeit vor, nicht nur wenn ausgerechnet diese eine Buchung
// absichtlich neu angelegt wurde — in der Praxis war saved_at nach kurzer
// Zeit fast immer neuer als jeder Tombstone, wodurch die Löschmarkierung
// beim nächsten Laden zuverlässig wieder verworfen wurde. Da eine neu
// angelegte Buchung ohnehin immer eine FRISCHE ID bekommt (nie die einer
// gelöschten), gibt es keinen legitimen Fall, in dem dieselbe ID absichtlich
// wieder auftauchen sollte — die Sonderregel war unnötig und schädlich.
// Tombstones laufen jetzt ausschließlich über die feste MAX_AGE_MS-Frist ab.
//
// Zweites Gerät (z.B. Mac löscht, iPhone hat die Buchung noch lokal):
// dieses Gerät kennt die Löschung nicht und kann sie beim eigenen nächsten
// Push versehentlich wieder hochladen. Deshalb werden Tombstones auch als
// Teil des Config-Payloads mitsynchronisiert (getTombstonesForSync/
// mergeRemoteTombstones) — jedes Gerät lernt beim nächsten Cloud-Kontakt
// (auch ohne expliziten "Cloud laden"-Klick) die Löschungen der anderen
// Geräte und bereinigt seinen eigenen lokalen Stand entsprechend, BEVOR es
// wieder etwas hochlädt.
import { kvStore } from "./kvStore.js";

const KEY = "mbt_tx_tombstones";
const MAX_AGE_MS = 180 * 24 * 60 * 60 * 1000; // 180 Tage — danach verworfen, damit die Liste nicht unbegrenzt wächst

function readAll() {
  try { return JSON.parse(kvStore.getItem(KEY) || "{}"); } catch(e) { return {}; }
}
function writeAll(map) {
  kvStore.setItem(KEY, JSON.stringify(map));
}
function prune(map) {
  const now = Date.now();
  Object.keys(map).forEach(id => { if(now - map[id] > MAX_AGE_MS) delete map[id]; });
}

// Eine oder mehrere Buchungs-IDs als "gerade lokal gelöscht" vermerken.
export function recordDeletedTxs(ids) {
  const list = (Array.isArray(ids) ? ids : [ids]).filter(Boolean);
  if(!list.length) return;
  const map = readAll();
  const now = Date.now();
  list.forEach(id => { map[id] = now; });
  prune(map);
  writeAll(map);
}

// Entfernt aus `txs` bedingungslos alle Buchungen, die lokal als gelöscht
// vermerkt sind — unabhängig davon, wie "neu" der geladene Datensatz
// aussieht (siehe Kommentar oben, warum ein Freshness-Vergleich hier der
// eigentliche Bug war).
export function filterTombstonedTxs(txs) {
  if(!Array.isArray(txs) || !txs.length) return txs;
  const map = readAll();
  const ids = Object.keys(map);
  if(!ids.length) return txs;
  return txs.filter(t => map[t.id] === undefined);
}

// Für den Cloud-Sync: alle bekannten Tombstones als flaches {id: deletedAtMs},
// zum Mitschicken im Config-Payload (siehe cfSave in App.jsx).
export function getTombstonesForSync() {
  const map = readAll();
  prune(map);
  return map;
}

// Von einem anderen Gerät mitgelieferte Tombstones lokal übernehmen (bei
// jedem Cloud-Kontakt, nicht erst nach einem bestätigten "Cloud laden").
// Gibt zurück, ob sich dadurch der lokale Bestand verändert hat — der
// Aufrufer sollte dann den eigenen `txs`-State per filterTombstonedTxs(…)
// bereinigen, damit eine an anderer Stelle gelöschte Buchung nicht beim
// nächsten eigenen Push versehentlich erneut hochgeladen wird.
export function mergeRemoteTombstones(remoteMap) {
  if(!remoteMap || typeof remoteMap !== "object") return false;
  const local = readAll();
  let changed = false;
  Object.entries(remoteMap).forEach(([id, ts]) => {
    if(!id || typeof ts !== "number") return;
    if(local[id] === undefined || ts < local[id]) { local[id] = ts; changed = true; }
  });
  if(changed) { prune(local); writeAll(local); }
  return changed;
}
