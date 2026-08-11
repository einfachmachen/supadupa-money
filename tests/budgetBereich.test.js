// BudgetBereich — der gemeinsame Baustein fuer die Budget-Kategorien in ALLEN
// Aufrissen (Prognose Mitte/Ende, Buchungen, VM, unkategorisiert).
//
// Vorher hatte jeder Aufriss seine eigene Fassung, und jede Korrektur musste
// dreimal gemacht werden — mit dem Ergebnis, dass sie auseinanderliefen. Die
// Tests halten die Bestandteile fest, um die es dabei ging.

import { describe, it, expect, beforeAll } from "vitest";
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { BudgetBereich } from "../src/components/molecules/BudgetBereich.jsx";

beforeAll(() => {
  globalThis.ResizeObserver = class { observe(){} unobserve(){} disconnect(){} };
});

async function zeichne(props, kinder = null) {
  const el = document.createElement("div");
  document.body.appendChild(el);
  const root = createRoot(el);
  await act(() => root.render(React.createElement(BudgetBereich, props, kinder)));
  return { el, text: el.textContent, root };
}

const BASIS = { datum: "2026-08-14", name: "Essen & Trinken", budget: 125, genutzt: 68.12 };

describe("BudgetBereich", () => {
  it("zeigt Datum, Name, offen, Budget und genutzt", async () => {
    const { text, root } = await zeichne(BASIS);
    expect(text).toContain("14.08.");
    expect(text).toContain("Essen & Trinken");
    expect(text).toContain("offen:");
    expect(text).toContain("56,88");            // 125 − 68,12
    expect(text).toContain("Budget:");
    expect(text).toContain("125,00");
    expect(text).toContain("genutzt:");
    expect(text).toContain("68,12");
    await act(async () => root.unmount());
  });

  it("rechnet mit Absolutwerten — negativ uebergebene Betraege ergeben dasselbe", async () => {
    const a = await zeichne(BASIS);
    const b = await zeichne({ ...BASIS, budget: -125, genutzt: -68.12 });
    expect(b.text).toBe(a.text);
    await act(async () => { a.root.unmount(); b.root.unmount(); });
  });

  it("zeigt bei nicht genutztem Budget einen Strich statt einer Null", async () => {
    const { text, root } = await zeichne({ ...BASIS, genutzt: 0 });
    expect(text).toContain("—");
    expect(text).not.toContain("0,00");
    await act(async () => root.unmount());
  });

  it("meldet die Ueberschreitung statt eines negativen offen-Betrags", async () => {
    const { text, root } = await zeichne({ ...BASIS, budget: 50, genutzt: 84.08 });
    expect(text).toContain("um 34,08 drüber");
    expect(text).not.toContain("offen:");
    await act(async () => root.unmount());
  });

  it("setzt bei Einnahmen ein Plus statt eines Minus", async () => {
    const { text, root } = await zeichne({ ...BASIS, isInc: true });
    expect(text).toContain("+56,88");
    expect(text).not.toContain("−56,88");
    await act(async () => root.unmount());
  });

  it("zeigt den Trennstrich nur, wenn Einzelposten folgen", async () => {
    const ohne = await zeichne(BASIS);
    const mit = await zeichne(BASIS, React.createElement("div", null, "Penny"));
    const striche = (el) => [...el.querySelectorAll("div")]
      .filter(d => (d.getAttribute("style") || "").includes("border-top")).length;
    expect(striche(ohne.el)).toBe(0);
    expect(striche(mit.el)).toBe(1);
    expect(mit.text).toContain("Penny");
    await act(async () => { ohne.root.unmount(); mit.root.unmount(); });
  });

  it("kommt ohne Datum aus (Aufrisse ohne Stichtag)", async () => {
    const { text, root } = await zeichne({ ...BASIS, datum: null });
    expect(text).toContain("Essen & Trinken");
    expect(text).toContain("offen:");
    await act(async () => root.unmount());
  });
});
