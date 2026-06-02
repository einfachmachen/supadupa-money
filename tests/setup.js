// Globales Test-Setup.
//
// Stellt ein vollwertiges, deterministisches `localStorage` bereit –
// unabhaengig von der Node-Version. Node >= 22 bringt ein eigenes Web-Storage
// mit, das ohne `--localstorage-file` deaktiviert ist und sowohl das globale
// `localStorage` als auch jsdoms `window.localStorage` unbrauchbar macht.
// Ohne diesen Shim scheitern die Tests mit
// "Cannot read properties of undefined (reading 'clear')".
//
// Wichtig: Der Ersatz verhaelt sich wie echtes localStorage – insbesondere
// liefert `Object.keys(localStorage)` die gespeicherten Schluessel (kvStore.js
// nutzt das fuer die Migration). Daher liegen die Werte als eigene,
// enumerierbare Properties auf dem Objekt, die Methoden sind non-enumerable.

function createStorage() {
  const s = {};
  Object.defineProperties(s, {
    getItem: {
      value(key) {
        const k = String(key);
        return Object.prototype.hasOwnProperty.call(s, k) ? s[k] : null;
      },
      enumerable: false,
    },
    setItem: {
      value(key, value) {
        s[String(key)] = String(value);
      },
      enumerable: false,
    },
    removeItem: {
      value(key) {
        delete s[String(key)];
      },
      enumerable: false,
    },
    clear: {
      value() {
        for (const k of Object.keys(s)) delete s[k];
      },
      enumerable: false,
    },
    key: {
      value(index) {
        return Object.keys(s)[index] ?? null;
      },
      enumerable: false,
    },
    length: {
      get() {
        return Object.keys(s).length;
      },
      enumerable: false,
    },
  });
  return s;
}

const storage = createStorage();

function install(target) {
  if (!target) return;
  try {
    Object.defineProperty(target, "localStorage", {
      value: storage,
      configurable: true,
      writable: true,
    });
  } catch {
    try {
      target.localStorage = storage;
    } catch {
      /* nicht ueberschreibbar – ignorieren */
    }
  }
}

install(globalThis);
if (typeof window !== "undefined") install(window);
if (typeof global !== "undefined") install(global);
