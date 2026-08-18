// Flexibler Topf im Bank-Abruf.
//
// Beim Abruf standen die Eintraege bisher nur mit Kategorie, Notiz, Tag und
// Loeschen da — „Unvorhergesehenes" liess sich erst hinterher zuordnen, indem
// man jeden Eintrag einzeln oeffnet. Der Knopf sitzt deshalb platzsparend in
// der Bedienzeile, die es ohnehin schon gibt.
//
// Der Bank-Abruf laesst sich ohne echten Bankzugang nicht im Browser
// ausloesen, deshalb hier als Komponententest: gerendert wird mit einem
// vorgegebenen Abruf-Zustand, geklickt wird echt.

import { describe, it, expect, beforeAll } from "vitest";
import "fake-indexeddb/auto";
import React, { act } from "react";
import { renderToString } from "react-dom/server";
import { createRoot } from "react-dom/client";
import { AppCtx } from "../src/state/AppContext.js";
import { mockCtx } from "./_mockCtx.js";
import { BankFetchPanel } from "../src/components/organisms/BankFetchPanel.jsx";

beforeAll(() => {
  if (!globalThis.ResizeObserver) {
    globalThis.ResizeObserver = class { observe(){} unobserve(){} disconnect(){} };
    if (typeof window !== "undefined") window.ResizeObserver = globalThis.ResizeObserver;
  }
  if (typeof window !== "undefined" && !window.matchMedia)
    window.matchMedia = () => ({ matches:false, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){} });
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
});

// Context wie im Render-Smoke-Test, aber mit eigenen Werten fuer das, worauf
// es hier ankommt.
const ctxMit = (extra) => new Proxy({}, {
  get: (_t, k) => (typeof k !== "symbol" && k in extra ? extra[k] : mockCtx[k]),
  has: () => true,
});

const TOPF = { id: "sub-topf", name: "Unvorhergesehenes" };
const CATS_MIT_TOPF = [{ id: "cat-sonstiges", name: "Sonstiges", type: "expense", subs: [TOPF, { id: "sub-x", name: "Anderes" }] }];

const zustand = (rows) => ({ status: "done", staged: rows, dupeItems: [], banks: [] });
const zeile = (over = {}) => ({
  id: "t1", date: "2026-08-18", desc: "Werkstatt", totalAmount: -120,
  accountId: "acc-giro", _csvType: "expense", splits: [], ...over,
});

const baue = (props, cats) => React.createElement(
  AppCtx.Provider, { value: ctxMit({ cats }) },
  React.createElement(BankFetchPanel, {
    state: zustand(props.rows), onClose: () => {}, onRefetch: () => {},
    onUpdateStaged: props.onUpdateStaged || (() => {}),
    onConfirm: () => {}, onPromoteDupe: () => {},
  }));

describe("Bank-Abruf: Topf-Knopf je Eintrag", () => {
  it("erscheint bei einer Ausgabe, wenn es die Kategorie gibt", () => {
    const html = renderToString(baue({ rows: [zeile()] }, CATS_MIT_TOPF));
    expect(html).toContain('aria-label="aus Unvorhergesehenes bezahlen"');
  });

  it("fehlt, wenn es die Kategorie Unvorhergesehenes gar nicht gibt", () => {
    const html = renderToString(baue({ rows: [zeile()] }, []));
    expect(html).not.toContain('aria-label="aus Unvorhergesehenes bezahlen"');
  });

  it("fehlt bei Einnahmen — der Topf ist ein Ausgaben-Budget", () => {
    const html = renderToString(baue({ rows: [zeile({ _csvType: "income", totalAmount: 120 })] }, CATS_MIT_TOPF));
    expect(html).not.toContain('aria-label="aus Unvorhergesehenes bezahlen"');
  });

  it("fehlt, wenn der Eintrag ohnehin schon im Topf liegt", () => {
    const drin = zeile({ splits: [{ id: "s1", catId: "cat-sonstiges", subId: TOPF.id, amount: -120 }] });
    const html = renderToString(baue({ rows: [drin] }, CATS_MIT_TOPF));
    expect(html).not.toContain('aria-label="aus Unvorhergesehenes bezahlen"');
  });

  it("zeigt den gesetzten Stand an", () => {
    const html = renderToString(baue({ rows: [zeile({ _potSubId: TOPF.id })] }, CATS_MIT_TOPF));
    expect(html).toContain('aria-pressed="true"');
  });

  it("setzt und entfernt _potSubId beim Antippen", () => {
    const behaelter = document.createElement("div");
    document.body.appendChild(behaelter);
    let liste = [zeile()];
    const onUpdateStaged = (fn) => { liste = fn(liste); };

    const root = createRoot(behaelter);
    act(() => { root.render(baue({ rows: liste, onUpdateStaged }, CATS_MIT_TOPF)); });
    const knopf = behaelter.querySelector('[aria-label="aus Unvorhergesehenes bezahlen"]');
    expect(knopf, "Knopf nicht gefunden").toBeTruthy();

    act(() => { knopf.click(); });
    expect(liste[0]._potSubId, "Topf wurde nicht gesetzt").toBe(TOPF.id);

    // Erneut antippen hebt es wieder auf — sonst waere die Zuordnung eine
    // Einbahnstrasse und nur noch ueber den Bearbeiten-Dialog zu loesen.
    act(() => { root.render(baue({ rows: liste, onUpdateStaged }, CATS_MIT_TOPF)); });
    const knopf2 = behaelter.querySelector('[aria-label="aus Unvorhergesehenes bezahlen"]');
    act(() => { knopf2.click(); });
    expect(liste[0]._potSubId, "Topf liess sich nicht aufheben").toBeUndefined();

    act(() => { root.unmount(); });
    behaelter.remove();
  });
});
