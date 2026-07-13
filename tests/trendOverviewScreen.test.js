// Regression-Test für die responsive Balken-Detailansicht (YearBarRows) in
// TrendOverviewScreen: muss ohne Crash rendern (auch mit ResizeObserver, den
// jsdom nicht nativ kennt — Polyfill s. beforeAll) und darf bei negativen
// Jahreswerten (Betrags-Label unterhalb des Balkens) die rotierte
// Jahreszahl nicht überlagern.
import { describe, it, expect, beforeAll } from "vitest";
import React from "react";
import { createRoot } from "react-dom/client";
import { AppCtx } from "../src/state/AppContext.js";
import { TrendOverviewScreen } from "../src/components/screens/TrendOverviewScreen.jsx";
import { mockCtx } from "./_mockCtx.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { act } = React;

beforeAll(() => {
  if (!globalThis.ResizeObserver) {
    globalThis.ResizeObserver = class { observe(){} unobserve(){} disconnect(){} };
    if (typeof window !== "undefined") window.ResizeObserver = globalThis.ResizeObserver;
  }
});

const TXS = [
  { id: "t1", accountId: "acc-giro", date: "2025-03-01", desc: "Miese", totalAmount: -50,
    pending: false, _csvType: "expense", splits: [] },
  { id: "t2", accountId: "acc-giro", date: "2026-01-05", desc: "Gehalt", totalAmount: 2000,
    pending: false, _csvType: "income", splits: [] },
];

function renderScreen() {
  const ctx = new Proxy({}, {
    get(_t, key) {
      if (key === "txs") return TXS;
      if (key === "getKumulierterSaldo") return () => -300; // erzwingt ein negatives Jahr in der Skala
      if (key === "getCat") return () => null;
      if (key === "getBudgetForMonth") return () => 0;
      if (key === "selAcc") return null;
      if (key === "setYear") return () => {};
      if (key === "setSubTab") return () => {};
      return mockCtx[key];
    },
    has() { return true; },
  });
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(React.createElement(AppCtx.Provider, { value: ctx },
      React.createElement(TrendOverviewScreen)));
  });
  return { container, root };
}

describe("TrendOverviewScreen — Balken-Detailansicht", () => {
  it("rendert die Endekontostand-Detailansicht ohne Crash und zeigt Balken+Jahreszahlen", () => {
    const { container, root } = renderScreen();
    const metricBtn = [...container.querySelectorAll("button")]
      .find(b => b.textContent.includes("Endekontostand"));
    expect(metricBtn).toBeTruthy();
    act(() => { metricBtn.click(); });

    const svgs = container.querySelectorAll("svg");
    expect(svgs.length).toBeGreaterThan(0);
    expect(container.textContent).toMatch(/202[0-9]/);
    act(() => { root.unmount(); });
    container.remove();
  });

  it("hält bei negativen Werten genug Abstand zwischen Betrags-Label und Jahreszahl", () => {
    const { container, root } = renderScreen();
    const metricBtn = [...container.querySelectorAll("button")]
      .find(b => b.textContent.includes("Endekontostand"));
    act(() => { metricBtn.click(); });

    const texts = [...container.querySelectorAll("svg text")];
    // Ein Betrags-Label (kein rotate-Transform) und ein Jahres-Label (mit
    // rotate-Transform) dürfen sich nicht überlappen — grobe Prüfung: beide
    // Text-Arten sind vorhanden und die y-Koordinate der Jahreszahl liegt
    // unterhalb (größer) als die des zugehörigen Betrags-Labels.
    const yearTexts = texts.filter(t => (t.getAttribute("transform") || "").includes("rotate"));
    const amountTexts = texts.filter(t => !(t.getAttribute("transform") || "").includes("rotate"));
    expect(yearTexts.length).toBeGreaterThan(0);
    expect(amountTexts.length).toBeGreaterThan(0);
    yearTexts.forEach(yt => {
      const y = Number(yt.getAttribute("y"));
      amountTexts.forEach(at => {
        const ay = Number(at.getAttribute("y"));
        expect(y).toBeGreaterThan(ay);
      });
    });
    act(() => { root.unmount(); });
    container.remove();
  });
});
