// Token-Ablage (src/utils/licenseToken.js).
//
// Gespeichert wird über kvStore (IndexedDB), wie alle Einstellungen dieser
// App — NICHT über localStorage. Der Unterschied ist kein Schoenheitsfehler:
// kvStore.migrateFromLocalStorage() raeumt App-Schluessel aus localStorage
// ab, und der Cache ist die einzige Quelle, die alle anderen Einstellungen
// lesen. Ein Token daneben waere der einzige Wert, der anders lebt.
//
// Die Signatur wird hier bewusst NICHT geprueft — der Client kennt
// LICENSE_SECRET nicht. Geprueft wird allein `exp`; die Signatur traegt fuer
// den Server (siehe Kommentar in licenseToken.js).

// fake-indexeddb + kvStore.init(): vor der Initialisierung liest kvStore aus
// localStorage, schreibt aber schon in seinen Cache — Lesen und Schreiben
// laegen dann auseinander. In der App kann das nicht passieren (main.jsx
// rendert erst nach kvStore.init()), im Test muss man es herstellen.
import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import {
  TOKEN_KEY, decodeToken, isTokenValid,
  loadLocalToken, saveLocalToken, clearLocalToken,
} from "../src/utils/licenseToken.js";
import { kvStore } from "../src/utils/kvStore.js";

const jetzt = () => Math.floor(Date.now() / 1000);

// Ein Token bauen, wie es der Worker ausstellt: Base64(payload) + "." + sig.
function baueToken(ueberschreiben = {}) {
  const payload = {
    email: "kunde@example.com",
    tier: "pro",
    products: ["money"],
    iat: jetzt(),
    exp: jetzt() + 30 * 24 * 60 * 60,
    ...ueberschreiben,
  };
  // Die Signatur ist hier belanglos: der Client rechnet sie nie nach.
  return `${btoa(JSON.stringify(payload))}.c2lnbmF0dXI`;
}

describe("Lizenz-Token", () => {
  beforeEach(async () => {
    await kvStore.init();
    kvStore.removeItem(TOKEN_KEY);
  });

  it("liegt im kvStore, nicht in localStorage", () => {
    saveLocalToken(baueToken());
    expect(kvStore.getItem(TOKEN_KEY)).toBeTruthy();
    // Der Schluessel traegt das mbt_-Praefix, damit ihn die Migration in
    // kvStore.js als App-Schluessel erkennt.
    expect(TOKEN_KEY.startsWith("mbt_")).toBe(true);
  });

  it("zerlegt ein gueltiges Token", () => {
    const d = decodeToken(baueToken());
    expect(d.payload.email).toBe("kunde@example.com");
    expect(d.payload.tier).toBe("pro");
    expect(d.payload.products).toEqual(["money"]);
  });

  it("weist alles zurueck, was kein Token ist", () => {
    for (const murks of [null, undefined, "", "ohnepunkt", "zu.viele.teile", 42, {}]) {
      expect(decodeToken(murks), String(murks)).toBeNull();
    }
    // Gueltige Struktur, aber kein JSON in der Nutzlast.
    expect(decodeToken(`${btoa("kein json")}.sig`)).toBeNull();
  });

  it("rechnet exp in SEKUNDEN, nicht in Millisekunden", () => {
    // Der Worker schreibt Unix-Sekunden. Wuerde hier gegen Date.now() in
    // Millisekunden verglichen, waere JEDES Token sofort abgelaufen.
    expect(isTokenValid({ exp: jetzt() + 60 })).toBe(true);
    expect(isTokenValid({ exp: jetzt() - 60 })).toBe(false);
    expect(isTokenValid({ exp: Date.now() })).toBe(true);
    expect(isTokenValid({})).toBe(false);
    expect(isTokenValid(null)).toBe(false);
  });

  it("legt ein gueltiges Token ab und liest es zurueck", () => {
    const token = baueToken();
    expect(saveLocalToken(token)).toBe(true);
    const geladen = loadLocalToken();
    expect(geladen.token).toBe(token);
    expect(geladen.data.tier).toBe("pro");
  });

  it("legt abgelaufene oder kaputte Token gar nicht erst ab", () => {
    expect(saveLocalToken(baueToken({ exp: jetzt() - 1 }))).toBe(false);
    expect(saveLocalToken("murks")).toBe(false);
    expect(kvStore.getItem(TOKEN_KEY)).toBeNull();
  });

  it("entsorgt ein abgelaufenes Token beim Lesen", () => {
    // Am Speicher vorbei ablegen — so sieht der Fall aus, wenn das Token
    // erst nach dem Ablegen ablaeuft (der Normalfall nach 30 Tagen).
    kvStore.setItem(TOKEN_KEY, baueToken({ exp: jetzt() - 1 }));
    expect(loadLocalToken()).toBeNull();
    expect(kvStore.getItem(TOKEN_KEY)).toBeNull();
  });

  it("clearLocalToken raeumt auf", () => {
    saveLocalToken(baueToken());
    clearLocalToken();
    expect(loadLocalToken()).toBeNull();
  });
});
