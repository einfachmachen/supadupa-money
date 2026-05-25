// IndexedDB-Helper (Drop-in für das originale window.IDB)
const DB_NAME = "mybudgettracker";
const STORE = "appdata";
const KV_STORE = "kvstore"; // 2. Object-Store für kvStore-Wrapper (Settings, kleine KV-Daten)
const DB_VERSION = 2;
let _db = null;

export function openDB() {
  if (_db) return Promise.resolve(_db);
  return new Promise((res, rej) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if(!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      if(!db.objectStoreNames.contains(KV_STORE)) db.createObjectStore(KV_STORE);
    };
    req.onsuccess = e => { _db = e.target.result; res(_db); };
    req.onerror = e => rej(e.target.error);
  });
}

export async function idbGet(key) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => res(req.result);
    req.onerror = e => rej(e.target.error);
  });
}

export async function idbSet(key, val) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, "readwrite");
    const req = tx.objectStore(STORE).put(val, key);
    req.onsuccess = () => res();
    req.onerror = e => rej(e.target.error);
  });
}

// Migrations-Helper: räumt das alte localStorage-Format auf
export function migrateLegacyLocalStorage() {
  try {
    const ls = localStorage.getItem("finanzapp_v9");
    if (!ls) return;
    const d = JSON.parse(ls);
    delete d.isLand;
    localStorage.setItem("finanzapp_v9", JSON.stringify(d));
  } catch (e) { /* ignore */ }
}

// Legacy-Bridge: macht window.IDB verfügbar, damit ggf. globaler
// (nicht migrierter) Code weiter funktioniert.
export function installLegacyBridge() {
  if (typeof window !== "undefined") {
    window.IDB = {
      DB_NAME, STORE,
      open: openDB,
      get: idbGet,
      set: idbSet,
    };
  }
}
