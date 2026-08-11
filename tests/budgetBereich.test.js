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

  it("zeigt die Einzelposten NICHT von sich aus", async () => {
    // Eine Kategorie mit acht Zahlungen schob sonst alles Weitere aus dem Bild.
    const { el, root } = await zeichne(BASIS, React.createElement("div", null, "Penny"));
    expect(el.textContent).not.toContain("Penny");
    const striche = [...el.querySelectorAll("div")]
      .filter(d => (d.getAttribute("style") || "").includes("border-top"));
    expect(striche).toHaveLength(0);
    await act(async () => root.unmount());
  });

  it("klappt die Einzelposten per Tipp auf den Namen auf und wieder zu", async () => {
    const { el, root } = await zeichne(BASIS, React.createElement("div", null, "Penny"));
    const kopf = el.firstChild.firstElementChild;      // Zeile 1 in der Karte
    await act(async () => kopf.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(el.textContent).toContain("Penny");
    await act(async () => kopf.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(el.textContent).not.toContain("Penny");
    await act(async () => root.unmount());
  });

  it("nennt eingeklappt die Anzahl der Posten", async () => {
    const { el, root } = await zeichne(BASIS, [
      React.createElement("div", { key: "a" }, "Penny"),
      React.createElement("div", { key: "b" }, "Netto"),
      React.createElement("div", { key: "c" }, "Rewe"),
    ]);
    expect(el.textContent).toContain("3");
    await act(async () => root.unmount());
  });

  it("ohne Posten bleibt der Kopf unklickbar", async () => {
    const { el, root } = await zeichne(BASIS);
    const kopf = el.firstChild.firstElementChild;
    expect((kopf.getAttribute("style") || "")).toContain("cursor: default");
    await act(async () => root.unmount());
  });

  it("haelt den Seitenrand ein, den der Aufrufer vorgibt", async () => {
    // In der Prognose kommt der Einzug vom Panel (0), die Aufrisse setzen ihn
    // selbst — sonst laufen die Karten dort von Kante zu Kante.
    const ohne = await zeichne(BASIS);
    const mit = await zeichne({ ...BASIS, seitenrand: 10 });
    expect(ohne.el.firstChild.getAttribute("style")).toContain("margin: 0px 0px 8px");
    expect(mit.el.firstChild.getAttribute("style")).toContain("margin: 0px 10px 8px");
    await act(async () => { ohne.root.unmount(); mit.root.unmount(); });
  });

  it("kommt ohne Datum aus (Aufrisse ohne Stichtag)", async () => {
    const { text, root } = await zeichne({ ...BASIS, datum: null });
    expect(text).toContain("Essen & Trinken");
    expect(text).toContain("offen:");
    await act(async () => root.unmount());
  });
});
