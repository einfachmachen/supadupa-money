import { describe, it, expect, beforeEach } from "vitest";
import {
  saveEbCreds, saveEbAccountMap, exportEbForSync, importEbFromSync, loadEbCreds, loadEbAccountMap,
} from "../src/utils/enableBankingStore.js";
import { encryptJSON, decryptJSON } from "../src/utils/syncCrypto.js";

// Einfacher window.IDB-Mock (Map-basiert), wie der echte Bridge in main.jsx.
let idbMap;
beforeEach(() => {
  idbMap = new Map();
  window.IDB = {
    get: async (k) => (idbMap.has(k) ? idbMap.get(k) : null),
    set: (k, v) => { idbMap.set(k, v); },
  };
  // kvStore-Reste aus vorherigen Tests entfernen
  try { localStorage.clear(); } catch {}
});

const PEM = "-----BEGIN PRIVATE KEY-----\nMIIabc...\n-----END PRIVATE KEY-----";

describe("Enable-Banking Sync-Export/Import", () => {
  it("exportiert dauerhafte Verbindungsdaten inkl. privatem Schlüssel", async () => {
    saveEbCreds({ relayUrl: "https://relay.example/", appId: "app-123", privateKey: PEM });
    saveEbAccountMap({ "uid-1": "acc-giro" });
    const block = await exportEbForSync();
    expect(block).toEqual({
      relayUrl: "https://relay.example/",
      appId: "app-123",
      privateKey: PEM,
      accountMap: { "uid-1": "acc-giro" },
    });
  });

  it("gibt null zurück, wenn kein privater Schlüssel vorhanden ist", async () => {
    saveEbCreds({ relayUrl: "https://relay.example/", appId: "app-123" });
    expect(await exportEbForSync()).toBeNull();
  });

  it("importiert auf ein frisches Gerät (kein lokaler Schlüssel)", async () => {
    const block = { relayUrl: "https://relay.example/", appId: "app-123", privateKey: PEM, accountMap: { "uid-1": "acc-giro" } };
    const ok = await importEbFromSync(block);
    expect(ok).toBe(true);
    const creds = await loadEbCreds();
    expect(creds.privateKey).toBe(PEM);
    expect(creds.appId).toBe("app-123");
    expect(await loadEbAccountMap()).toEqual({ "uid-1": "acc-giro" });
  });

  it("überschreibt einen vorhandenen lokalen Schlüssel NICHT (lokal hat Vorrang)", async () => {
    saveEbCreds({ privateKey: "LOKAL-SCHON-DA" });
    const ok = await importEbFromSync({ privateKey: PEM, appId: "fremd" });
    expect(ok).toBe(false);
    const creds = await loadEbCreds();
    expect(creds.privateKey).toBe("LOKAL-SCHON-DA");
  });

  it("ignoriert ungültige Blöcke", async () => {
    expect(await importEbFromSync(null)).toBe(false);
    expect(await importEbFromSync({})).toBe(false);
    expect(await importEbFromSync({ appId: "x" })).toBe(false); // ohne privateKey
  });

  it("verschlüsselter Datei-Export des Bank-Schlüssels: Round-Trip mit Passphrase", async () => {
    saveEbCreds({ relayUrl: "https://relay.example/", appId: "app-123", privateKey: PEM });
    const env = await encryptJSON(await exportEbForSync(), "geheime-phrase");
    // frisches Gerät simulieren
    idbMap.clear(); try { localStorage.clear(); } catch {}
    const block = await decryptJSON(env, "geheime-phrase");
    expect(await importEbFromSync(block)).toBe(true);
    expect((await loadEbCreds()).privateKey).toBe(PEM);
  });

  it("falsche Passphrase entschlüsselt den exportierten Schlüssel NICHT", async () => {
    saveEbCreds({ privateKey: PEM });
    const env = await encryptJSON(await exportEbForSync(), "richtig");
    await expect(decryptJSON(env, "falsch")).rejects.toThrow(/Falsche Passphrase|beschädigte/i);
  });
});
