// Realtest: kvStore mit echter IndexedDB-Implementierung (via fake-indexeddb)
import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";

describe("kvStore Integration", () => {
  let kvStore;

  beforeEach(async () => {
    // jsdom hat eigenes localStorage — leeren
    localStorage.clear();
    // fake-indexeddb reset (neuer + alter Name)
    indexedDB.deleteDatabase("supadupa-money");
    indexedDB.deleteDatabase("mybudgettracker");
    // Warte kurz auf Async-Delete
    await new Promise(r => setTimeout(r, 50));
    // Modul neu laden (jeder Test bekommt frisches Modul mit leerem Cache)
    const modPath = "../src/utils/kvStore.js?t=" + Date.now() + Math.random();
    const mod = await import(modPath);
    kvStore = mod.kvStore;
  });

  it("Migration aus localStorage funktioniert", async () => {
    localStorage.setItem("mbt_theme", "dark");
    localStorage.setItem("mbt_handedness", "left");
    localStorage.setItem("cf_url", "https://example.cf.com");
    localStorage.setItem("not_app_key", "ignore me");
    // großes Payload soll NICHT migriert werden
    localStorage.setItem("finanzapp_v9", "{\"big\":\"payload\"}");

    await kvStore.init();

    // App-Keys da
    expect(kvStore.getItem("mbt_theme")).toBe("dark");
    expect(kvStore.getItem("mbt_handedness")).toBe("left");
    expect(kvStore.getItem("cf_url")).toBe("https://example.cf.com");
    // Fremde Keys NICHT migriert, bleiben in LS
    expect(kvStore.getItem("not_app_key")).toBeNull();
    expect(localStorage.getItem("not_app_key")).toBe("ignore me");
    // Großes Payload NICHT in kvStore, bleibt in LS
    expect(kvStore.getItem("finanzapp_v9")).toBeNull();
    expect(localStorage.getItem("finanzapp_v9")).toBe("{\"big\":\"payload\"}");
    // App-Keys aus LS entfernt
    expect(localStorage.getItem("mbt_theme")).toBeNull();
    expect(localStorage.getItem("cf_url")).toBeNull();
  });

  it("setItem/getItem/removeItem synchron nach init()", async () => {
    await kvStore.init();
    kvStore.setItem("mbt_test", "hello");
    expect(kvStore.getItem("mbt_test")).toBe("hello");
    kvStore.removeItem("mbt_test");
    expect(kvStore.getItem("mbt_test")).toBeNull();
  });

  it("Daten bleiben nach Modul-Reset erhalten (echt persistent)", async () => {
    await kvStore.init();
    kvStore.setItem("mbt_theme", "ocean");
    // Warte auf async-Write
    await new Promise(r => setTimeout(r, 100));

    // Frisches Modul laden — neuer Cache
    const modPath = "../src/utils/kvStore.js?t=second-" + Date.now() + Math.random();
    const mod2 = await import(modPath);
    const kv2 = mod2.kvStore;
    await kv2.init();
    expect(kv2.getItem("mbt_theme")).toBe("ocean");
  });

  it("getItem vor init() fällt auf localStorage zurück", async () => {
    localStorage.setItem("mbt_test", "from-ls");
    // NICHT init() aufrufen — der Cache ist leer, sollte aus LS lesen
    expect(kvStore.getItem("mbt_test")).toBe("from-ls");
  });
});
