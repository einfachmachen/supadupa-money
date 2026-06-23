// IndexedDB-Helper (Drop-in für das originale window.IDB)
const DB_NAME = "supadupa-money";
const OLD_DB_NAME = "mybudgettracker"; // Vorgänger-Name — wird einmalig verlustfrei migriert
const STORE = "appdata";
const KV_STORE = "kvstore"; // 2. Object-Store für kvStore-Wrapper (Settings, Hauptdaten)
const DB_VERSION = 2;
let _db = null;
let _dbPromise = null;

export function openDB() {
  if (_db) return Promise.resolve(_db);
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((res, rej) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if(!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      if(!db.objectStoreNames.contains(KV_STORE)) db.createObjectStore(KV_STORE);
    };
    req.onsuccess = e => {
      const db = e.target.result;
      // Einmalige, verlustfreie Migration aus der alten DB (Name wurde geändert).
      // MUSS vor dem Auflösen geschehen, damit kvStore.init() schon die Daten sieht.
      migrateFromOld(db)
        .catch(err => { try { console.warn("[DB-Migration]", err); } catch(_) {} })
        .then(() => { _db = db; res(_db); });
    };
    req.onerror = e => rej(e.target.error);
    // Mehrere offene Tabs können das Öffnen blockieren — nicht ewig warten.
    req.onblocked = () => rej(new Error("IndexedDB blockiert (anderer Tab offen?)"));
  });
  return _dbPromise;
}

// ── Migration: kopiert appdata + kvstore aus OLD_DB_NAME, falls die neue DB noch
//    leer ist und noch nicht migriert wurde. Einmalig, verlustfrei. ──
async function migrateFromOld(db) {
  if (await markerGet(db)) return;                 // schon migriert
  if (await storeHasAny(db, KV_STORE)) {           // neue DB hat schon Daten → nicht überschreiben
    await markerSet(db); return;
  }
  // Existiert die alte DB überhaupt? (databases() vermeidet, sie versehentlich anzulegen)
  let oldExists = true;
  try {
    if (indexedDB.databases) {
      const list = await indexedDB.databases();
      oldExists = (list || []).some(d => d && d.name === OLD_DB_NAME);
    }
  } catch(_) { /* databases() nicht unterstützt → wir versuchen es einfach */ }
  if (oldExists) {
    const oldDb = await openOld(OLD_DB_NAME);
    if (oldDb) {
      try {
        await copyStore(oldDb, db, KV_STORE);
        await copyStore(oldDb, db, STORE);
      } finally { try { oldDb.close(); } catch(_) {} }
    }
  }
  await markerSet(db);
}

// Migrations-Marker liegt im appdata-Store (damit der kvstore sauber bleibt).
function markerGet(db) {
  return new Promise(res => {
    try {
      const tx = db.transaction(STORE, "readonly");
      const r = tx.objectStore(STORE).get("__migrated_from_legacy");
      r.onsuccess = () => res(r.result);
      r.onerror = () => res(undefined);
    } catch(_) { res(undefined); }
  });
}
function markerSet(db) {
  return new Promise(res => {
    try {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(1, "__migrated_from_legacy");
      tx.oncomplete = () => res();
      tx.onerror = () => res();
    } catch(_) { res(); }
  });
}
function storeHasAny(db, storeName) {
  return new Promise(res => {
    try {
      const tx = db.transaction(storeName, "readonly");
      const req = tx.objectStore(storeName).openCursor();
      req.onsuccess = e => res(!!e.target.result);
      req.onerror = () => res(false);
    } catch(_) { res(false); }
  });
}
function openOld(name) {
  return new Promise(res => {
    let req;
    try { req = indexedDB.open(name); } catch(_) { return res(null); }
    req.onupgradeneeded = () => { /* alte DB existierte nicht → leer lassen */ };
    req.onsuccess = e => res(e.target.result);
    req.onerror = () => res(null);
  });
}
function copyStore(oldDb, newDb, storeName) {
  return new Promise(res => {
    if (!oldDb.objectStoreNames.contains(storeName)) return res();
    const entries = [];
    let rtx;
    try { rtx = oldDb.transaction(storeName, "readonly"); } catch(_) { return res(); }
    const cur = rtx.objectStore(storeName).openCursor();
    cur.onsuccess = e => {
      const c = e.target.result;
      if (c) { entries.push([c.key, c.value]); c.continue(); }
      else {
        if (!entries.length) return res();
        try {
          const wtx = newDb.transaction(storeName, "readwrite");
          const st = wtx.objectStore(storeName);
          entries.forEach(([k, v]) => st.put(v, k));
          wtx.oncomplete = () => res();
          wtx.onerror = () => res();
        } catch(_) { res(); }
      }
    };
    cur.onerror = () => res();
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
