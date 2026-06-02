// Globales Test-Setup.
//
// Stellt sicher, dass das globale `localStorage` auf jsdoms echte
// Implementierung (`window.localStorage`) zeigt – unabhaengig von der
// Node-Version. Node >= 22 bringt ein eigenes Web-Storage mit, das ohne
// `--localstorage-file` deaktiviert ist und das globale `localStorage`
// ueberschattet. Ohne diesen Shim scheitern die Tests sonst mit
// "Cannot read properties of undefined (reading 'clear')".
//
// Wir biegen das globale `localStorage` bewusst auf `window.localStorage`,
// damit Tests (globales `localStorage`) und App-Code (ggf. `window.localStorage`)
// denselben Speicher benutzen.

if (typeof window !== "undefined" && window.localStorage) {
  try {
    Object.defineProperty(globalThis, "localStorage", {
      value: window.localStorage,
      configurable: true,
      writable: true,
    });
  } catch {
    try {
      globalThis.localStorage = window.localStorage;
    } catch {
      /* read-only Global – nicht ueberschreibbar, ignorieren */
    }
  }
}
