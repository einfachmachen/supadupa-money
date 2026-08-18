// Stille Erneuerung des Lizenz-Tokens (src/hooks/useLicense.js).
//
// Das Token gilt 30 Tage — bewusst so lang, damit die PWA offline
// funktioniert. Ohne Erneuerung hiesse das aber: JEDER zahlende Nutzer faellt
// nach einem Monat wortlos auf „frei" zurueck und muss seinen Code erneut
// eintippen. Der Fehler faellt niemandem beim Entwickeln auf, sondern
// dreissig Tage nach dem ersten Verkauf.
//
// Drei Faelle, die auseinandergehalten werden muessen:
//   • frisches Token      → gar nicht erst fragen (kein unnoetiger Aufruf)
//   • bald ablaufend      → erneuern, im Hintergrund, ohne Anzeige
//   • Lizenz verworfen    → aufraeumen und den Grund nennen
// Und der wichtigste: offline darf NICHTS passieren. Wer im Zug die App
// oeffnet, verliert seine Lizenz nicht.

import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { useLicense } from "../src/hooks/useLicense.js";
import { kvStore } from "../src/utils/kvStore.js";
import { TOKEN_KEY, CODE_KEY } from "../src/utils/licenseToken.js";

// Sonst warnt React bei jedem act(): "environment is not configured to
// support act(...)" — dieselbe Zeile steht in den anderen Klick-Tests.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const jetzt = () => Math.floor(Date.now() / 1000);

function baueToken(ueberschreiben = {}) {
  const payload = {
    email: "kunde@example.com", tier: "premium", products: ["money"],
    iat: jetzt(), exp: jetzt() + 30 * 24 * 60 * 60, ...ueberschreiben,
  };
  return `${btoa(JSON.stringify(payload))}.c2lnbmF0dXI`;
}

// Den Hook in einem echten Baum laufen lassen — der useEffect soll ja feuern.
let container, root, gesehen;
async function mounte() {
  gesehen = null;
  function Probe() { gesehen = useLicense(); return null; }
  container = document.createElement("div");
  document.body.appendChild(container);
  await act(async () => {
    root = createRoot(container);
    root.render(React.createElement(Probe));
  });
  // Der Erneuerungs-Aufruf ist asynchron: einen Tick nachlaufen lassen.
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
}

describe("Stille Lizenz-Erneuerung", () => {
  beforeEach(async () => {
    await kvStore.init();
    kvStore.removeItem(TOKEN_KEY);
    kvStore.removeItem(CODE_KEY);
    vi.restoreAllMocks();
  });

  afterEach(async () => {
    if (root) await act(async () => root.unmount());
    container?.remove();
    root = null;
  });

  it("fragt gar nicht erst, wenn das Token noch frisch ist", async () => {
    kvStore.setItem(TOKEN_KEY, baueToken());
    kvStore.setItem(CODE_KEY, "ABCD-1234");
    const holen = vi.fn();
    globalThis.fetch = holen;

    await mounte();

    expect(holen).not.toHaveBeenCalled();
    expect(gesehen.istFreigeschaltet).toBe(true);
  });

  it("erneuert ein bald ablaufendes Token im Hintergrund", async () => {
    // Zwei Tage Restlaufzeit: innerhalb der Erneuerungsfrist.
    kvStore.setItem(TOKEN_KEY, baueToken({ exp: jetzt() + 2 * 24 * 60 * 60 }));
    kvStore.setItem(CODE_KEY, "ABCD-1234");
    const neu = baueToken({ tier: "premium" });
    globalThis.fetch = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ token: neu }) }));

    await mounte();

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const [, init] = globalThis.fetch.mock.calls[0];
    // Der gemerkte Code geht mit — sonst koennte der Server nichts pruefen.
    expect(JSON.parse(init.body)).toMatchObject({ licenseCode: "ABCD-1234", product: "money" });
    expect(kvStore.getItem(TOKEN_KEY)).toBe(neu);
    expect(gesehen.istFreigeschaltet).toBe(true);
    // Eine Erneuerung im Hintergrund darf keine Fehlermeldung hinterlassen.
    expect(gesehen.lizenzFehler).toBe("");
  });

  it("offline passiert NICHTS — die Lizenz bleibt", async () => {
    const alt = baueToken({ exp: jetzt() + 2 * 24 * 60 * 60 });
    kvStore.setItem(TOKEN_KEY, alt);
    kvStore.setItem(CODE_KEY, "ABCD-1234");
    globalThis.fetch = vi.fn(async () => { throw new Error("offline"); });

    await mounte();

    expect(kvStore.getItem(TOKEN_KEY)).toBe(alt);
    expect(kvStore.getItem(CODE_KEY)).toBe("ABCD-1234");
    expect(gesehen.istFreigeschaltet).toBe(true);
  });

  it("ein Serverfehler sperrt niemanden aus", async () => {
    // 500 ist kein Urteil ueber die Lizenz — beim naechsten Start nochmal.
    const alt = baueToken({ exp: jetzt() + 2 * 24 * 60 * 60 });
    kvStore.setItem(TOKEN_KEY, alt);
    kvStore.setItem(CODE_KEY, "ABCD-1234");
    globalThis.fetch = vi.fn(async () => ({ ok: false, status: 500, json: async () => ({ error: "secret_not_configured" }) }));

    await mounte();

    expect(kvStore.getItem(CODE_KEY)).toBe("ABCD-1234");
    expect(gesehen.istFreigeschaltet).toBe(true);
  });

  it("eine widerrufene Lizenz wird aufgeraeumt und begruendet", async () => {
    kvStore.setItem(TOKEN_KEY, baueToken({ exp: jetzt() + 2 * 24 * 60 * 60 }));
    kvStore.setItem(CODE_KEY, "ABCD-1234");
    globalThis.fetch = vi.fn(async () => ({
      ok: false, status: 402, json: async () => ({ error: "license_not_found" }),
    }));

    await mounte();

    expect(kvStore.getItem(TOKEN_KEY)).toBeNull();
    // Auch der Code muss weg, sonst fragt die App bei JEDEM Start erneut.
    expect(kvStore.getItem(CODE_KEY)).toBeNull();
    expect(gesehen.istFreigeschaltet).toBe(false);
    expect(gesehen.lizenzFehler).toMatch(/kennen wir nicht/);
  });

  it("ohne gemerkten Code wird nicht gefragt", async () => {
    globalThis.fetch = vi.fn();
    await mounte();
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(gesehen.istFreigeschaltet).toBe(false);
  });

  it("Freischalten merkt sich den Code fuer spaeter", async () => {
    const token = baueToken();
    globalThis.fetch = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ token }) }));
    await mounte();

    await act(async () => { await gesehen.freischalten("  neu-5678  "); });

    // Getrimmt gespeichert — sonst schlaegt die Erneuerung spaeter fehl.
    expect(kvStore.getItem(CODE_KEY)).toBe("neu-5678");
    expect(gesehen.istFreigeschaltet).toBe(true);
  });

  it("Entfernen loescht auch den Code", async () => {
    kvStore.setItem(TOKEN_KEY, baueToken());
    kvStore.setItem(CODE_KEY, "ABCD-1234");
    globalThis.fetch = vi.fn();
    await mounte();

    await act(async () => { gesehen.lizenzEntfernen(); });

    expect(kvStore.getItem(TOKEN_KEY)).toBeNull();
    expect(kvStore.getItem(CODE_KEY)).toBeNull();
    expect(gesehen.istFreigeschaltet).toBe(false);
  });
});
