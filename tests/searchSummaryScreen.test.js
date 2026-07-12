// Regression/Feature-Test: "Suche & Summe" muss aus einer Tag-/Text-Suche
// die richtige Gesamtsumme, eine Monats-Aufteilung und (bei gesetztem
// von/bis) eine Zeitraum-Einschränkung liefern — genau der vom Nutzer
// gewünschte Anwendungsfall ("was hat mich #aida insgesamt gekostet,
// aufgeteilt nach Monat bzw. für einen Zeitraum").
import { describe, it, expect } from "vitest";
import React from "react";
import { createRoot } from "react-dom/client";
import { AppCtx } from "../src/state/AppContext.js";
import { SearchSummaryScreen } from "../src/components/screens/SearchSummaryScreen.jsx";
import { mockCtx } from "./_mockCtx.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { act } = React;

function setNativeValue(el, value) {
  const proto = el.tagName === "INPUT" ? window.HTMLInputElement.prototype : window.HTMLTextAreaElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value").set;
  setter.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

const CAT = { id: "cat-food", name: "Kreuzfahrt", type: "expense",
  subs: [{ id: "sub-a", name: "Bordkonto" }, { id: "sub-b", name: "Ausflüge" }] };

const TXS = [
  { id: "t1", accountId: "acc-giro", date: "2026-07-05", desc: "AIDA Bordkonto", totalAmount: -300,
    pending: false, _csvType: "expense", tags: ["aida"],
    splits: [{ id: "sp1", catId: "cat-food", subId: "sub-a", amount: -300 }] },
  { id: "t2", accountId: "acc-giro", date: "2026-07-13", desc: "AIDA Ausflug Rom", totalAmount: -80,
    pending: false, _csvType: "expense", tags: ["aida"],
    splits: [{ id: "sp2", catId: "cat-food", subId: "sub-b", amount: -80 }] },
  { id: "t3", accountId: "acc-giro", date: "2026-08-02", desc: "AIDA Nachbuchung", totalAmount: -25,
    pending: false, _csvType: "expense", tags: ["aida"],
    splits: [{ id: "sp3", catId: "cat-food", subId: "sub-a", amount: -25 }] },
  { id: "t4", accountId: "acc-giro", date: "2026-07-10", desc: "Unrelated", totalAmount: -10,
    pending: false, _csvType: "expense", splits: [] },
];

function renderScreen() {
  const ctx = new Proxy({}, {
    get(_t, key) {
      if (key === "txs") return TXS;
      if (key === "getCat") return (id) => (id === CAT.id ? CAT : null);
      if (key === "getSub") return (catId, subId) => CAT.subs.find(s => s.id === subId) || null;
      if (key === "openEdit") return () => {};
      return mockCtx[key];
    },
    has() { return true; },
  });
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(React.createElement(AppCtx.Provider, { value: ctx },
      React.createElement(SearchSummaryScreen, { onClose: () => {} })));
  });
  return { container, root };
}

describe("SearchSummaryScreen", () => {
  it("summiert alle Positionen, die auf #aida matchen, über mehrere Monate hinweg", () => {
    const { container, root } = renderScreen();
    const input = container.querySelector('input[placeholder="Suchen… Text, #tag oder Betrag"]');
    expect(input).toBeTruthy();
    act(() => { setNativeValue(input, "#aida"); });

    expect(container.textContent).toContain("−405,00"); // 300+80+25
    expect(container.textContent).toContain("Positionen");
    expect(container.textContent).toContain("3");
    // "Unrelated" (kein Tag, kein Textmatch) darf NICHT auftauchen
    expect(container.textContent).not.toContain("Unrelated");
    act(() => { root.unmount(); });
    container.remove();
  });

  it("zeigt die Aufteilung je Monat korrekt getrennt", () => {
    const { container, root } = renderScreen();
    const input = container.querySelector('input[placeholder="Suchen… Text, #tag oder Betrag"]');
    act(() => { setNativeValue(input, "#aida"); });

    expect(container.textContent).toContain("Juli 2026");
    expect(container.textContent).toContain("August 2026");
    expect(container.textContent).toContain("−380,00"); // Juli: 300+80
    expect(container.textContent).toContain("−25,00");  // August
    act(() => { root.unmount(); });
    container.remove();
  });

  it("von/bis-Zeitraum schränkt die Treffer (und die Summe) korrekt ein", () => {
    const { container, root } = renderScreen();
    const input = container.querySelector('input[placeholder="Suchen… Text, #tag oder Betrag"]');
    act(() => { setNativeValue(input, "#aida"); });

    const dateInputs = container.querySelectorAll('input[type="date"]');
    expect(dateInputs.length).toBe(2);
    act(() => { setNativeValue(dateInputs[0], "2026-07-01"); });
    act(() => { setNativeValue(dateInputs[1], "2026-07-31"); });

    // Nur Juli: 300+80 = 380 — die August-Nachbuchung (25) darf nicht mehr mitzählen
    expect(container.textContent).toContain("−380,00");
    expect(container.textContent).not.toContain("Nachbuchung");
    act(() => { root.unmount(); });
    container.remove();
  });

  it("ohne Suchbegriff wird kein Ergebnis (und keine Summe) angezeigt", () => {
    const { container, root } = renderScreen();
    expect(container.textContent).not.toContain("−405,00");
    act(() => { root.unmount(); });
    container.remove();
  });
});
