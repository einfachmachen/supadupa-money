// Bank-Schlüssel und Export-Verschlüsselung im Daten-Manager.
//
// Vorher hatte der Bank-Schlüssel eine EIGENE Passphrase — zusätzlich zu
// Passphrase und Recovery-Code des Exports. Wer den Haken setzte, wurde nach
// einem zweiten Geheimnis gefragt, ohne dass irgendwo stand wozu
// (Nutzer-Hinweis: „Müssen das 2 unterschiedliche sein?").
//
// Sie war trotzdem kein Unfug: die Gesamt-Verschlüsselung ist ABSCHALTBAR, und
// ohne eigene Passphrase läge der private Schlüssel dann offen in der Datei.
// Genau diesen Fall schließt der Umbau aus — der Schlüssel darf nur in eine
// verschlüsselte Sicherung. Dadurch wird die zweite Passphrase überflüssig,
// nicht weggelassen.
//
// Dieser Test hält beides fest: die Vereinfachung UND die Bedingung, unter der
// sie sicher ist. Fällt die Kopplung irgendwann heraus, geht der private
// Schlüssel im Klartext in die Datei — und genau das prüft der letzte Fall am
// echten Dateiinhalt, nicht an der Oberfläche.

import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import "fake-indexeddb/auto";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { AppCtx } from "../src/state/AppContext.js";
import { mockCtx } from "./_mockCtx.js";

const PEM = "-----BEGIN PRIVATE KEY-----GEHEIM-GEHEIM-GEHEIM-----END PRIVATE KEY-----";

// Ein Gerät MIT Bank-Schlüssel — sonst ist der Haken gar nicht bedienbar.
vi.mock("../src/utils/enableBankingStore.js", () => ({
  exportEbForSync: async () => ({ pem: PEM, appId: "test" }),
  importEbFromSync: async () => true,
}));

const { DataManagerDialog } = await import("../src/components/organisms/DataManagerDialog.jsx");

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// Der Inhalt der geschriebenen Datei. jsdom kennt `Blob.text()` nicht, also
// den Text abgreifen, wo er entsteht.
let letzterInhalt = null;
beforeAll(() => {
  const EchtesBlob = globalThis.Blob;
  globalThis.Blob = class extends EchtesBlob {
    constructor(teile, opts) { super(teile, opts); letzterInhalt = (teile || []).join(""); }
  };
  if (!globalThis.ResizeObserver) {
    globalThis.ResizeObserver = class { observe(){} unobserve(){} disconnect(){} };
    if (typeof window !== "undefined") window.ResizeObserver = globalThis.ResizeObserver;
  }
  if (typeof window !== "undefined" && !window.matchMedia)
    window.matchMedia = () => ({ matches:false, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){} });
  // Die geschriebene Datei abfangen statt sie zu speichern.
  URL.createObjectURL = () => "blob:test";
  URL.revokeObjectURL = () => {};
  HTMLAnchorElement.prototype.click = function () {};
});

let behaelter, wurzel;
afterEach(async () => {
  if (wurzel) await act(async () => wurzel.unmount());
  behaelter?.remove();
  wurzel = null; letzterInhalt = null;
});

async function oeffne() {
  behaelter = document.createElement("div");
  document.body.appendChild(behaelter);
  await act(async () => {
    wurzel = createRoot(behaelter);
    wurzel.render(React.createElement(AppCtx.Provider, { value: mockCtx },
      React.createElement(DataManagerDialog, { onClose: () => {} })));
  });
  // `hasEbKey` kommt aus einem Effekt (exportEbForSync) — einen Tick warten.
  await act(async () => { await new Promise(r => setTimeout(r, 0)); });
  return behaelter;
}

// Die anklickbare Zeile einer Wahlkarte (die Karte selbst hat noch den
// Erklärtext darunter).
const zeileMit = (el, text) =>
  [...el.querySelectorAll("div")].filter(d => (d.textContent || "").includes(text))
    .sort((a, b) => (a.textContent || "").length - (b.textContent || "").length)[0];

const knopfMit = (el, text) =>
  [...el.querySelectorAll("button")].find(b => new RegExp(text).test(b.textContent || ""));

async function warteAuf(pruefung, msMax = 8000) {
  const bis = Date.now() + msMax;
  while (Date.now() < bis) {
    if (pruefung()) return true;
    await act(async () => { await new Promise(r => setTimeout(r, 40)); });
  }
  return false;
}

describe("Bank-Schlüssel: ein Geheimnis-Paar für die ganze Datei", () => {
  it("steht VOR der Export-Verschlüsselung", async () => {
    // Reihenfolge der Bedienung = Reihenfolge der Vorgänge: erst kommt der
    // Schlüssel in die Datei, dann wird die Datei verschlüsselt.
    const el = await oeffne();
    const text = el.textContent;
    const schluessel = text.indexOf("Bank-Schlüssel mitsichern");
    const krypto = text.indexOf("Export verschlüsseln");
    expect(schluessel, "Bank-Schlüssel-Karte nicht gefunden").toBeGreaterThan(-1);
    expect(krypto, "Verschlüsselungs-Karte nicht gefunden").toBeGreaterThan(-1);
    expect(schluessel).toBeLessThan(krypto);
  });

  it("verlangt keine zweite Passphrase mehr", async () => {
    const el = await oeffne();
    const vorher = el.querySelectorAll('input[type="password"]').length;
    await act(async () => { zeileMit(el, "Bank-Schlüssel mitsichern").click(); });
    // Genau die zwei Felder der Export-Verschlüsselung, kein drittes/viertes.
    expect(el.querySelectorAll('input[type="password"]').length).toBe(vorher);
    expect(el.textContent).not.toMatch(/Passphrase für den Schlüssel/);
  });

  it("Schlüssel an schaltet die Verschlüsselung an", async () => {
    const el = await oeffne();
    // Erst ausschalten, damit der Effekt sichtbar wird.
    await act(async () => { zeileMit(el, "Export verschlüsseln").click(); });
    expect(el.textContent).toMatch(/Export wird als/);   // Klartext-Warnung steht

    await act(async () => { zeileMit(el, "Bank-Schlüssel mitsichern").click(); });
    expect(el.textContent).not.toMatch(/Export wird als/);
    expect(el.textContent).toMatch(/Recovery-Code/);
  });

  it("Verschlüsselung aus nimmt den Schlüssel wieder heraus", async () => {
    // Die Gegenrichtung ist der eigentliche Schutz: ohne sie könnte man den
    // Schlüssel aktivieren und die Verschlüsselung danach abschalten.
    const el = await oeffne();
    await act(async () => { zeileMit(el, "Bank-Schlüssel mitsichern").click(); });
    await act(async () => { zeileMit(el, "Export verschlüsseln").click(); });
    expect(el.textContent).toMatch(/Export wird als/);   // Klartext-Warnung steht

    // Der Beleg ist die Datei, nicht der Haken: eine unverschlüsselte
    // Sicherung darf den Schlüssel unter keinen Umständen enthalten.
    await act(async () => { knopfMit(el, "Als JSON speichern").click(); });
    expect(await warteAuf(() => !!letzterInhalt), "keine Datei geschrieben").toBe(true);
    const datei = JSON.parse(letzterInhalt);
    expect(datei.__enc, "Sicherung sollte hier Klartext sein").toBeUndefined();
    expect(datei._ebSecure).toBeUndefined();
    expect(letzterInhalt).not.toContain("BEGIN PRIVATE KEY");
  });

  it("der private Schlüssel steht nie im Klartext in der Datei", async () => {
    const el = await oeffne();
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;

    await act(async () => { zeileMit(el, "Bank-Schlüssel mitsichern").click(); });
    for (const f of [...el.querySelectorAll('input[type="password"]')].slice(0, 2)) {
      await act(async () => {
        setter.call(f, "eine-lange-passphrase");
        f.dispatchEvent(new Event("input", { bubbles: true }));
      });
    }
    await act(async () => { knopfMit(el, "Als JSON speichern").click(); });
    expect(await warteAuf(() => !!letzterInhalt), "keine Datei geschrieben").toBe(true);

    const inhalt = letzterInhalt;
    expect(inhalt).not.toContain(PEM);
    expect(inhalt).not.toContain("BEGIN PRIVATE KEY");
    // Gegenprobe: es IST ein Umschlag, nicht einfach eine Datei ohne Schlüssel.
    expect(JSON.parse(inhalt)).toHaveProperty("ct");
  });
});
