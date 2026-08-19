// Bestätigung nach dem Speichern einer Sicherung (DataManagerDialog).
//
// Der Recovery-Code wird bei jedem Öffnen des Dialogs neu erzeugt. Das ist
// RICHTIG so — jede Sicherung ist ein eigener, in sich geschlossener Umschlag
// (`isEncrypted(datei)` + Entschlüsseln mit Passphrase + Code GENAU DIESER
// Datei). Nur wusste das niemand: Wer den Dialog zweimal öffnete, sah zwei
// Codes und hatte keine Möglichkeit zu erkennen, welcher zu welcher Datei
// gehört (Nutzer-Hinweis, mitten in der Umzugsvorbereitung).
//
// Deshalb nennt die App nach dem Schreiben Dateiname UND Code zusammen — und
// sagt ausdrücklich, dass ein neuer Code ältere Dateien nicht ungültig macht.
//
// Warum ein eigener Test: Der Zweig erscheint erst NACH einem Export. Der
// Render-Smoke-Test in screens_render.test.js sieht ihn nie — genau deshalb
// ist dort auch ein fehlender Import (`NUM_FONT`) durchgerutscht, der zur
// Laufzeit geworfen hätte.

import { describe, it, expect, beforeAll, afterEach } from "vitest";
import "fake-indexeddb/auto";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { AppCtx } from "../src/state/AppContext.js";
import { mockCtx } from "./_mockCtx.js";
import { DataManagerDialog } from "../src/components/organisms/DataManagerDialog.jsx";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

beforeAll(() => {
  if (!globalThis.ResizeObserver) {
    globalThis.ResizeObserver = class { observe(){} unobserve(){} disconnect(){} };
    if (typeof window !== "undefined") window.ResizeObserver = globalThis.ResizeObserver;
  }
  if (typeof window !== "undefined" && !window.matchMedia)
    window.matchMedia = () => ({ matches:false, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){} });
  // Der Export legt eine Datei an — im Test nur abfangen, nicht ausführen.
  if (!URL.createObjectURL) URL.createObjectURL = () => "blob:test";
  if (!URL.revokeObjectURL) URL.revokeObjectURL = () => {};
  HTMLAnchorElement.prototype.click = function () {};
});

let behaelter, wurzel;
afterEach(async () => {
  if (wurzel) await act(async () => wurzel.unmount());
  behaelter?.remove();
  wurzel = null;
});

async function oeffne() {
  behaelter = document.createElement("div");
  document.body.appendChild(behaelter);
  await act(async () => {
    wurzel = createRoot(behaelter);
    wurzel.render(React.createElement(AppCtx.Provider, { value: mockCtx },
      React.createElement(DataManagerDialog, { onClose: () => {} })));
  });
  return behaelter;
}

const knopfMit = (el, text) =>
  [...el.querySelectorAll("button")].find(b => new RegExp(text).test(b.textContent || ""));

// Der Export verschluesselt mit PBKDF2 (150 000 Runden, siehe syncCrypto.js) —
// das braucht echte Zeit, nicht nur ein paar Microtasks. Also warten, bis die
// Bestaetigung wirklich da ist.
async function warteAuf(el, muster, msMax = 5000) {
  const bis = Date.now() + msMax;
  while (Date.now() < bis) {
    if (muster.test(el.textContent || "")) return true;
    await act(async () => { await new Promise(r => setTimeout(r, 40)); });
  }
  return false;
}

describe("Bestätigung nach dem Speichern", () => {
  it("vor dem Export gibt es keine Bestätigung", async () => {
    const el = await oeffne();
    expect(el.textContent).not.toMatch(/Sicherung gespeichert/);
  });

  it("nach dem Speichern stehen Dateiname und Code zusammen", async () => {
    const el = await oeffne();

    // Passphrase + Wiederholung füllen, damit der Export nicht gesperrt ist.
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    const felder = [...el.querySelectorAll('input[type="password"]')];
    expect(felder.length, "erwartet: Passphrase + Wiederholung").toBeGreaterThanOrEqual(2);
    for (const f of felder.slice(0, 2)) {
      await act(async () => {
        setter.call(f, "eine-lange-passphrase");
        f.dispatchEvent(new Event("input", { bubbles: true }));
      });
    }

    const speichern = knopfMit(el, "Als JSON speichern");
    expect(speichern, "Speichern-Knopf nicht gefunden").toBeTruthy();
    await act(async () => { speichern.click(); });
    expect(await warteAuf(el, /Sicherung gespeichert/), "Bestaetigung erschien nicht").toBe(true);

    const text = el.textContent;
    expect(text).toMatch(/Sicherung gespeichert/);
    expect(text, "Dateiname fehlt").toMatch(/supadupa-backup-\d{4}-\d{2}-\d{2}\.json/);
    // Der entscheidende Satz — er beantwortet genau die Frage, die aufkam.
    expect(text).toMatch(/Jede Sicherung hat ihren/);
    expect(text).toMatch(/nicht.{0,3} ungueltig|nicht.{0,3} ungültig/);
  });

  it("der genannte Code ist der, mit dem verschluesselt wurde", async () => {
    const el = await oeffne();
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;

    // Den vor dem Export angezeigten Code merken …
    const vorher = (el.textContent.match(/[A-Z0-9]{4}(?:-[A-Z0-9]{4}){2,}/) || [])[0];
    expect(vorher, "kein Recovery-Code im Dialog gefunden").toBeTruthy();

    for (const f of [...el.querySelectorAll('input[type="password"]')].slice(0, 2)) {
      await act(async () => {
        setter.call(f, "eine-lange-passphrase");
        f.dispatchEvent(new Event("input", { bubbles: true }));
      });
    }
    await act(async () => { knopfMit(el, "Als JSON speichern").click(); });
    expect(await warteAuf(el, /Sicherung gespeichert/), "Bestaetigung erschien nicht").toBe(true);

    // … und pruefen, dass die Bestaetigung GENAU DEN nennt.
    const bestaetigung = el.textContent.split("Sicherung gespeichert")[1] || "";
    expect(bestaetigung).toContain(vorher);
  });
});
