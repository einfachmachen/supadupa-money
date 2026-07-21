// Persistente "höchster je erzeugter Monats-Schlüssel"-Wasserzeichen pro
// Sparplan-Bein (_seriesId).
//
// Hintergrund: planLegDecisions() (siehe sparPlanSeries.js) kann nur aus den
// GERADE NOCH vorhandenen Pending-Buchungen ableiten, wie weit eine Serie
// früher reichte. Löscht der Nutzer ausgerechnet die LETZTE (am weitesten in
// der Zukunft liegende) Rate eines Beins — z.B. eine einzelne Tagesgeld-
// Einnahme an einem fernen Datum — schrumpft dieser abgeleitete Höchstwert
// automatisch mit. Beim nächsten "Neuberechnen"/"Auto" sieht die gelöschte
// Rate dann wie ein ganz neuer, noch nie generierter Monat aus (jenseits der
// vermeintlichen alten Spanne) und wird fälschlich wieder angelegt — genau
// der wiederholt gemeldete "gelöschte Tagesgeld-Einnahme kommt zurück"-Fall.
//
// Das Wasserzeichen hier läuft unabhängig von Löschungen NUR VORWÄRTS (wird
// bei jedem doAktualisieren()-Lauf auf die aktuell berechnete Planspanne
// vorgezogen, nie zurückgesetzt) und wird — wie die Tombstones — auch über
// Cloud-Sync zwischen Geräten abgeglichen, damit ein zweites Gerät dieselbe
// Historie kennt, auch ohne dort je selbst "Neuberechnen" geklickt zu haben.
import { kvStore } from "./kvStore.js";

const KEY = "mbt_spar_watermarks";

function readAll() {
  try { return JSON.parse(kvStore.getItem(KEY) || "{}"); } catch(e) { return {}; }
}
function writeAll(map) {
  kvStore.setItem(KEY, JSON.stringify(map));
}

export function getSparWatermark(seriesId) {
  if(!seriesId) return -Infinity;
  const v = readAll()[seriesId];
  return typeof v === "number" ? v : -Infinity;
}

// Wasserzeichen einer Serie nur vorwärts setzen — nie verkleinern.
export function noteSparWatermark(seriesId, key) {
  if(!seriesId || typeof key !== "number" || !isFinite(key)) return;
  const map = readAll();
  if(!(seriesId in map) || map[seriesId] < key) {
    map[seriesId] = key;
    writeAll(map);
  }
}

// Für den Cloud-Sync: alle bekannten Wasserzeichen als flaches
// {seriesId: maxKey}, zum Mitschicken im Config-Payload (siehe cfSave in App.jsx).
export function getSparWatermarksForSync() {
  return readAll();
}

// Von einem anderen Gerät mitgelieferte Wasserzeichen lokal übernehmen (bei
// jedem Cloud-Kontakt) — jeweils das Maximum aus lokal/remote je Serie.
export function mergeRemoteSparWatermarks(remoteMap) {
  if(!remoteMap || typeof remoteMap !== "object") return false;
  const local = readAll();
  let changed = false;
  Object.entries(remoteMap).forEach(([seriesId, key]) => {
    if(!seriesId || typeof key !== "number") return;
    if(!(seriesId in local) || local[seriesId] < key) { local[seriesId] = key; changed = true; }
  });
  if(changed) writeAll(local);
  return changed;
}
