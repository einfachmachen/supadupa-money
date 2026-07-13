// Das Ausklapp-Symbol des Buchungstitels und der Kategorie-/Tag-Zeile
// (<ExpandableLine> in MonatScreen.jsx) soll NUR erscheinen, wenn die Zeile
// tatsächlich überläuft (per DOM-Messung scrollWidth vs. clientWidth) —
// nicht immer, und nicht per Heuristik. Außerdem darf NUR ein Klick auf das
// Symbol selbst aus-/einklappen — ein Klick auf den Rest der Zeile muss
// weiterhin den Bearbeiten-Dialog öffnen (Regression: eine frühere Version
// hat bei Überlauf die GANZE Zeile abgefangen und damit "Antippen öffnet
// Bearbeiten" für jede übergelaufene Buchung unerreichbar gemacht).
import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
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

function stubOverflow() {
  Object.defineProperty(Element.prototype, "scrollWidth", { configurable:true, get(){ return 300; } });
  Object.defineProperty(Element.prototype, "clientWidth", { configurable:true, get(){ return 100; } });
}

describe("ExpandableLine — Ausklapp-Pfeil nur bei Überlauf, blockiert nie den Bearbeiten-Zugriff", () => {
  afterEach(() => {
    delete Element.prototype.scrollWidth;
    delete Element.prototype.clientWidth;
  });

  it("zeigt keinen Pfeil, wenn die Zeile nicht überläuft", () => {
    const { container, root } = renderMonat({ txs: TXS });
    submitSearch(container, "Amazon");
    const lines = container.querySelectorAll("[data-expandable-line]");
    expect(lines.length).toBeGreaterThan(0);
    lines.forEach(line => expect(line.children.length).toBe(1)); // nur der innere Container
    act(() => { root.unmount(); });
    container.remove();
  });

  it("zeigt einen Pfeil, sobald die Zeile tatsächlich überläuft (Titel UND Kategorie-Zeile)", () => {
    stubOverflow();
    const { container, root } = renderMonat({ txs: TXS });
    submitSearch(container, "Amazon");
    const lines = container.querySelectorAll("[data-expandable-line]");
    expect(lines.length).toBeGreaterThanOrEqual(2); // Titel + Kategorie-Zeile
    lines.forEach(line => expect(line.children.length).toBe(2)); // innerer Container + Pfeil
    act(() => { root.unmount(); });
    container.remove();
  });

  it("Klick auf den Pfeil öffnet NICHT den Bearbeiten-Dialog, klappt stattdessen aus", () => {
    stubOverflow();
    const openEdit = vi.fn();
    const { container, root } = renderMonat({ txs: TXS, openEdit });
    submitSearch(container, "Amazon");
    const chevron = container.querySelector("[data-expandable-line] > span");
    expect(chevron).toBeTruthy();
    act(() => { chevron.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
    expect(openEdit).not.toHaveBeenCalled();
    act(() => { root.unmount(); });
    container.remove();
  });

  it("Klick auf den Rest einer übergelaufenen Zeile öffnet weiterhin Bearbeiten", () => {
    stubOverflow();
    const openEdit = vi.fn();
    const { container, root } = renderMonat({ txs: TXS, openEdit });
    submitSearch(container, "Amazon");
    const textPart = container.querySelector("[data-expandable-line] > div");
    expect(textPart).toBeTruthy();
    act(() => { textPart.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
    expect(openEdit).toHaveBeenCalled();
    act(() => { root.unmount(); });
    container.remove();
  });
});
