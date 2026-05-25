// kvStore — Drop-in-Ersatz für localStorage, der unter der Haube
// IndexedDB benutzt. Lädt beim Boot alle Keys einmal in einen
// In-Memory-Cache, sodass alle weiteren Operationen synchron-aussehend
// bleiben (getItem/setItem geben sofort zurück; Schreiben in IDB
// passiert asynchron im Hintergrund).
//
// Warum: localStorage ist synchron und blockiert die UI bei großen
// Werten (mehrere hundert ms bei 5 MB). IndexedDB ist asynchron und
// blockiert nie. Da der bestehende Code aber überall synchron auf
// localStorage zugreift (useState-Initialisierer etc.), brauchen wir
// einen synchron aussehenden Wrapper.
//
// Ablauf:
//  1) Boot: kvStore.init() liest alle bekannten Keys aus IDB in den Cache
//  2) Erstmalige Migration: noch in localStorage liegende Werte werden
//     in IDB übernommen und aus localStorage entfernt
//  3) Laufzeit: getItem/setItem/removeItem arbeiten auf dem Cache und
//     schreiben/löschen IDB asynchron im Hintergrund

import { openDB } from "../state/persistence.js";

const KV_STORE = "kvstore";

let cache = {};
let inited = false;
let _initPromise = null;

function kvIdbGetAll() {
  return openDB().then(db => new Promise((res, rej) => {
    const tx = db.transaction(KV_STORE, "readonly");
    const store = tx.objectStore(KV_STORE);
    const out = {};
    const req = store.openCursor();
    req.onsuccess = e => {
      const cursor = e.target.result;
      if(cursor) { out[cursor.key] = cursor.value; cursor.continue(); }
      else res(out);
    };
    req.onerror = e => rej(e.target.error);
  })).catch(() => ({}));
}

function kvIdbSet(key, value) {
  return openDB().then(db => new Promise((res, rej) => {
    const tx = db.transaction(KV_STORE, "readwrite");
    const req = tx.objectStore(KV_STORE).put(value, key);
    req.onsuccess = () => res();
    req.onerror = e => rej(e.target.error);
  })).catch(() => {});
}

function kvIdbDelete(key) {
  return openDB().then(db => new Promise((res, rej) => {
    const tx = db.transaction(KV_STORE, "readwrite");
    const req = tx.objectStore(KV_STORE).delete(key);
    req.onsuccess = () => res();
    req.onerror = e => rej(e.target.error);
  })).catch(() => {});
}

// Migration: einmalig vorhandene localStorage-Werte in IDB übernehmen.
// Nach erfolgreicher Migration werden die LS-Slots geleert, damit kein
// "Stand divergiert"-Problem entsteht.
function migrateFromLocalStorage() {
  try {
    if(typeof localStorage === "undefined") return;
    const keys = Object.keys(localStorage);
    for(const k of keys) {
      if(!isAppKey(k)) continue;
      const v = localStorage.getItem(k);
      if(v == null) continue;
      // IDB-Stand gewinnt, wenn schon vorhanden
      if(cache[k] === undefined) {
        cache[k] = v;
        kvIdbSet(k, v);
      }
      try { localStorage.removeItem(k); } catch(e) {}
    }
  } catch(e) {}
}

// Heuristik: welche LS-Keys gehören dieser App? Nur kleine Settings — nicht das
// große Payload (das wird separat in window.IDB unter "appdata" gehalten).
function isAppKey(k) {
  if(!k) return false;
  // finanzapp_* (großes Payload) und mbt_local_backup absichtlich NICHT übernehmen:
  // diese sind groß und werden bereits über window.IDB("appdata") verwaltet.
  if(k === "mbt_local_backup") return false;
  if(k.startsWith("finanzapp_")) return false;
  if(k.startsWith("mbt_")) return true;
  if(k.startsWith("supa_")) return true;
  if(k === "cf_url" || k === "cf_secret") return true;
  if(k === "jsonbin_key" || k === "jsonbin_id") return true;
  if(k === "gist_token" || k === "gist_id") return true;
  return false;
}

export const kvStore = {
  init() {
    if(inited) return Promise.resolve();
    if(_initPromise) return _initPromise;
    _initPromise = (async () => {
      try {
        cache = await kvIdbGetAll();
      } catch(e) {
        cache = {};
      }
      migrateFromLocalStorage();
      inited = true;
    })();
    return _initPromise;
  },

  getItem(key) {
    if(!inited) {
      try { return localStorage.getItem(key); } catch(e) { return null; }
    }
    const v = cache[key];
    return v === undefined ? null : v;
  },

  setItem(key, value) {
    const str = String(value);
    cache[key] = str;
    kvIdbSet(key, str);
  },

  removeItem(key) {
    delete cache[key];
    kvIdbDelete(key);
  },

  _cache() { return cache; },
  _isInited() { return inited; },
};

if(typeof window !== "undefined") {
  window.kvStore = kvStore;
}
