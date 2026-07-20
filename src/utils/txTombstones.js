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
// Fix: jede lokale Löschung wird hier mit Zeitstempel gemerkt. applyData()
// filtert beim Übernehmen von Cloud-/Lokal-Daten Buchungen heraus, die NACH
// dem Snapshot-Zeitstempel (saved_at) des geladenen Datensatzes gelöscht
// wurden — der Snapshot ist dann nachweislich älter als unsere Löschung.
// Taucht eine ID dagegen in einem NEUEREN Snapshot wieder auf, wurde sie
// offenbar bewusst neu angelegt — dann gewinnt der Snapshot und der
// Tombstone wird verworfen.
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

// Entfernt aus `txs` alle Buchungen, deren Tombstone NEUER ist als der
// Snapshot-Zeitstempel — also lokal gelöscht wurde, NACHDEM dieser
// Datensatz (Cloud oder lokal) gespeichert wurde. Ältere/gleichzeitige
// Tombstones gegenüber einem NEUEREN Snapshot werden verworfen (die
// Buchung wurde offenbar absichtlich neu angelegt).
export function filterTombstonedTxs(txs, snapshotTs) {
  if(!Array.isArray(txs) || !txs.length) return txs;
  const map = readAll();
  const ids = Object.keys(map);
  if(!ids.length) return txs;
  const ts = snapshotTs || 0;
  let mapChanged = false;
  const out = txs.filter(t => {
    const deletedAt = map[t.id];
    if(deletedAt === undefined) return true;
    if(deletedAt > ts) return false;
    delete map[t.id]; mapChanged = true;
    return true;
  });
  if(mapChanged) writeAll(map);
  return out;
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
// Aufrufer sollte dann den eigenen `txs`-State per filterTombstonedTxs(…, 0)
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
