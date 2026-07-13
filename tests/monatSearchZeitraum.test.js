// Die "Suche & Summe"-Funktion wurde aus einer eigenen, zu versteckten Ansicht
// in die (bereits vorhandene) globale Suche der Monatsansicht verschoben:
// von/bis-Zeitraum + eine Summen-Anzeige direkt bei der Suche.
import { describe, it, expect, beforeAll, vi } from "vitest";
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
  { id:"t1", date:"2026-01-05", desc:"Amazon Kauf",       totalAmount:-20, splits:[] },
  { id:"t2", date:"2026-02-10", desc:"Amazon Buch",       totalAmount:-15, splits:[] },
  { id:"t3", date:"2026-03-01", desc:"Amazon Erstattung", totalAmount:5,   splits:[] },
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

function setDateField(container, index, value) {
  const inputs = container.querySelectorAll('input[type="date"]');
  const input = inputs[index];
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  act(() => {
    setter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

describe("MonatScreen — Suche mit Zeitraum & Summe (statt eigener Suche&Summe-Ansicht)", () => {
  it("findet Treffer über alle Monate hinweg und zeigt die Summe", () => {
    const { container, root } = renderMonat({ txs: TXS });
    submitSearch(container, "Amazon");
    expect(container.textContent).toContain("Alle (3)");
    expect(container.textContent).toContain("35,00");   // Ausgaben: 20+15
    expect(container.textContent).toContain("5,00");    // Einnahmen
    act(() => { root.unmount(); });
    container.remove();
  });

  it("zeigt von/bis-Felder erst nach einer aktiven Suche", () => {
    const { container, root } = renderMonat({ txs: TXS });
    expect(container.querySelectorAll('input[type="date"]').length).toBe(0);
    submitSearch(container, "Amazon");
    expect(container.querySelectorAll('input[type="date"]').length).toBe(2);
    act(() => { root.unmount(); });
    container.remove();
  });

  it("engt Treffer + Summe über von/bis zuverlässig ein", () => {
    const { container, root } = renderMonat({ txs: TXS });
    submitSearch(container, "Amazon");
    setDateField(container, 0, "2026-02-01"); // von
    setDateField(container, 1, "2026-02-28"); // bis
    expect(container.textContent).toContain("Alle (1)");
    expect(container.textContent).toContain("15,00");
    expect(container.textContent).not.toContain("Amazon Kauf");
    expect(container.textContent).not.toContain("Amazon Erstattung");
    act(() => { root.unmount(); });
    container.remove();
  });

  it("zeigt die Ausgaben-Summe nur EINMAL (keine Dopplung mehr)", () => {
    const { container, root } = renderMonat({ txs: TXS });
    submitSearch(container, "Amazon");
    const occurrences = container.textContent.split("35,00").length - 1;
    expect(occurrences).toBe(1);
    act(() => { root.unmount(); });
    container.remove();
  });

  it("zeigt Tags auch bei Einnahmen (vorher nur bei Ausgaben gerendert)", () => {
    const txsWithTag = TXS.map(t => t.id==="t3" ? { ...t, tags:["reise"] } : t);
    const { container, root } = renderMonat({ txs: txsWithTag });
    submitSearch(container, "Amazon");
    expect(container.textContent).toContain("#reise");
    act(() => { root.unmount(); });
    container.remove();
  });

  it("weist per Bulk-Aktion einer Auswahl einen Tag zu (statt nur Kategorie)", () => {
    let lastTxs = null;
    const setTxs = vi.fn(fn => { lastTxs = typeof fn === "function" ? fn(TXS) : fn; });
    const { container, root } = renderMonat({ txs: TXS, setTxs });
    submitSearch(container, "Amazon");

    const selectAllBtn = [...container.querySelectorAll("button")].find(b => b.textContent.includes("Alle (3)"));
    act(() => { selectAllBtn.dispatchEvent(new MouseEvent("click", { bubbles: true })); });

    const tagModeBtn = [...container.querySelectorAll("button")].find(b => b.textContent.trim() === "Tag");
    expect(tagModeBtn).toBeTruthy();
    act(() => { tagModeBtn.dispatchEvent(new MouseEvent("click", { bubbles: true })); });

    const tagInput = container.querySelector('input[placeholder="Tag hinzufügen…"]');
    expect(tagInput).toBeTruthy();
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    act(() => {
      setter.call(tagInput, "reise");
      tagInput.dispatchEvent(new Event("input", { bubbles: true }));
    });
    act(() => {
      tagInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });

    const applyBtn = [...container.querySelectorAll("button")].find(b => b.textContent.trim() === "✓");
    act(() => { applyBtn.dispatchEvent(new MouseEvent("click", { bubbles: true })); });

    expect(setTxs).toHaveBeenCalled();
    expect(lastTxs.every(t => (t.tags||[]).includes("reise"))).toBe(true);
    act(() => { root.unmount(); });
    container.remove();
  });
});
