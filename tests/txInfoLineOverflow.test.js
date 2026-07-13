// Das Ausklapp-Symbol der Kategorie-/Tag-Zeile (TxInfoLine in MonatScreen.jsx)
// soll NUR erscheinen, wenn die Zeile tatsächlich überläuft (per DOM-Messung
// scrollWidth vs. clientWidth) — nicht immer, und nicht per Heuristik.
import { describe, it, expect, beforeAll, afterEach } from "vitest";
import "fake-indexeddb/auto";
import React from "react";
import { createRoot } from "react-dom/client";
import { AppCtx } from "../src/state/AppContext.js";
import { MonatScreen } from "../src/components/screens/MonatScreen.jsx";
import { mockCtx } from "./_mockCtx.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { act } = React;

beforeAll(() => {
  if (!globalThis.ResizeObserver) {
    globalThis.ResizeObserver = class { observe(){} unobserve(){} disconnect(){} };
    window.ResizeObserver = globalThis.ResizeObserver;
  }
  if (!window.matchMedia)
    window.matchMedia = () => ({ matches:false, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){} });
});

const TXS = [
  { id:"t1", date:"2026-01-05", desc:"Amazon Kauf", totalAmount:-20, splits:[], tags:["reise"] },
];

function renderMonat(overrides) {
  const ctx = new Proxy({}, {
    get(_t, key) { return key in overrides ? overrides[key] : mockCtx[key]; },
    has() { return true; },
  });
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(React.createElement(AppCtx.Provider, { value: ctx },
      React.createElement(MonatScreen)));
  });
  return { container, root };
}

function submitSearch(container, term) {
  const input = container.querySelector('input[placeholder="suchen… (Enter)"]');
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  act(() => {
    setter.call(input, term);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  act(() => {
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  });
}

describe("TxInfoLine — Ausklapp-Pfeil nur bei tatsächlichem Überlauf", () => {
  afterEach(() => {
    delete Element.prototype.scrollWidth;
    delete Element.prototype.clientWidth;
  });

  it("zeigt keinen Pfeil, wenn die Zeile nicht überläuft", () => {
    const { container, root } = renderMonat({ txs: TXS });
    submitSearch(container, "Amazon");
    const lines = container.querySelectorAll("[data-txinfo-line]");
    expect(lines.length).toBeGreaterThan(0);
    lines.forEach(line => expect(line.children.length).toBe(1)); // nur der innere Container
    act(() => { root.unmount(); });
    container.remove();
  });

  it("zeigt einen Pfeil, sobald die Zeile tatsächlich überläuft", () => {
    Object.defineProperty(Element.prototype, "scrollWidth", { configurable:true, get(){ return 300; } });
    Object.defineProperty(Element.prototype, "clientWidth", { configurable:true, get(){ return 100; } });

    const { container, root } = renderMonat({ txs: TXS });
    submitSearch(container, "Amazon");
    const lines = container.querySelectorAll("[data-txinfo-line]");
    expect(lines.length).toBeGreaterThan(0);
    lines.forEach(line => expect(line.children.length).toBe(2)); // innerer Container + Pfeil
    act(() => { root.unmount(); });
    container.remove();
  });
});
