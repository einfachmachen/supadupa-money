// Der Stern in der Konto-Schnellwahl (Hero) — echte Klick-Interaktion.
//
// Ergaenzt tests/startKonto.test.js (dort nur die Reihenfolge-Logik) und
// tests/contextDeps.test.js (dort nur die Verdrahtung des Contexts). Hier geht
// es um das, was dazwischen liegt und beim ersten Anlauf falsch war:
//
//   • Der Stern muss ueberhaupt gerendert werden — je Zeile einer.
//   • Ein Tipp darauf muss setStartKonto rufen und dabei NICHT die
//     Kontoauswahl umschalten (stopPropagation). Ohne das waere der Stern
//     nicht bedienbar: der Tipp wuerde das Menue schliessen.

import { describe, it, expect, beforeAll } from "vitest";
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { SaldoHeroV2 } from "../src/components/organisms/SaldoHeroV2.jsx";
import { AppCtx } from "../src/state/AppContext.js";

beforeAll(() => {
  globalThis.ResizeObserver = class { observe(){} unobserve(){} disconnect(){} };
  if (typeof window !== "undefined") window.ResizeObserver = globalThis.ResizeObserver;
});

const HERO_PROPS = {
  year: 2026, month: 7,
  buchInM: 0, buchOutM: 0, buchInE: 0, buchOutE: 0,
  pendInM: 0, pendOutM: 0, pendInE: 0, pendOutE: 0,
  uInM: 0, uOutM: 0, uInE: 0, uOutE: 0,
  prognoseMitte: 0, prognoseEnde: 0, detailMitte: null, detailEnde: null,
  saldoMitte: 0, saldoEnde: 0,
  detailsOpen: false, setDetailsOpen: () => {},
};

// Rendert den Hero mit zwei bebuchten Konten und liefert Helfer fuers Antippen.
async function heroAufbauen() {
  const el = document.createElement("div");
  document.body.appendChild(el);
  const protokoll = { startKonto: [], selAcc: [] };
  let startKonto = "";
  const root = createRoot(el);

  const zeichnen = () => act(() => root.render(
    React.createElement(AppCtx.Provider, {
      value: {
        selAcc: null,
        setSelAcc: (v) => protokoll.selAcc.push(v),
        startKonto,
        setStartKonto: (v) => { protokoll.startKonto.push(v); startKonto = v; zeichnen(); },
        accounts: [{ id: "acc-giro", name: "Giro" }, { id: "acc-tg", name: "Tagesgeld" }],
        txs: [
          { id: "t1", accountId: "acc-giro", date: "2026-08-01", totalAmount: -5, splits: [] },
          { id: "t2", accountId: "acc-tg",   date: "2026-08-01", totalAmount: -5, splits: [] },
        ],
        getKumulierterSaldo: () => 100,
        getCat: () => null, getSub: () => null,
        amtMode: 2, setAmtMode: () => {},
        setShowGuidedTour: () => {},
        debugFlags: {}, setDebugFlag: () => {},
      },
    }, React.createElement(SaldoHeroV2, HERO_PROPS)),
  ));

  await zeichnen();
  const klick = (node) => act(async () =>
    node.dispatchEvent(new MouseEvent("click", { bubbles: true })));
  const sterne = () => [...el.querySelectorAll("span[title]")]
    .filter(s => /Start/.test(s.getAttribute("title") || ""));
  // Beschriftung der Zeile, zu der ein Stern gehoert (Stern-Eltern = die Zeile).
  const zeilen = () => sterne().map(s => ({
    name: s.parentElement.textContent.trim(),
    start: s.getAttribute("title") === "Wird beim Start angezeigt",
  }));
  const menueOeffnen = async () => {
    const pille = [...el.querySelectorAll("span[title]")]
      .find(s => s.getAttribute("title") === "Konto wählen");
    expect(pille, "Konto-Pille im Hero").toBeTruthy();
    await klick(pille);
  };
  return { el, root, protokoll, sterne, zeilen, klick, menueOeffnen };
}

describe("Konto-Schnellwahl — Stern", () => {
  it("zeigt je Zeile einen Stern (Gesamt + jedes bebuchte Konto)", async () => {
    const h = await heroAufbauen();
    await h.menueOeffnen();
    expect(h.sterne()).toHaveLength(3);
    await act(async () => h.root.unmount());
  });

  it("markiert ohne Startkonto die Gesamt-Zeile", async () => {
    const h = await heroAufbauen();
    await h.menueOeffnen();
    expect(h.sterne()[0].getAttribute("title")).toBe("Wird beim Start angezeigt");
    await act(async () => h.root.unmount());
  });

  it("setzt beim Antippen das Startkonto", async () => {
    const h = await heroAufbauen();
    await h.menueOeffnen();
    await h.klick(h.sterne()[1]);            // zweite Zeile = erstes Konto
    expect(h.protokoll.startKonto).toEqual(["acc-giro"]);
    await act(async () => h.root.unmount());
  });

  it("schaltet dabei NICHT die Kontoauswahl um (stopPropagation)", async () => {
    const h = await heroAufbauen();
    await h.menueOeffnen();
    await h.klick(h.sterne()[1]);
    expect(h.protokoll.selAcc).toEqual([]);   // ohne stopPropagation stuende hier "acc-giro"
    await act(async () => h.root.unmount());
  });

  it("laesst die Zeile beim Antippen an ihrer Stelle", async () => {
    // Ohne eingefrorene Reihenfolge sortiert sich die Liste im selben Moment um
    // (Startkonto nach oben). Unter dem Finger stuende dann eine ANDERE Zeile
    // mit leerem Stern — es sieht aus, als liesse sich der Stern nicht setzen.
    // Genau das war gemeldet und im Browser nachgestellt.
    const h = await heroAufbauen();
    await h.menueOeffnen();
    const vorher = h.zeilen().map(z => z.name);
    await h.klick(h.sterne()[1]);
    const nachher = h.zeilen();
    expect(nachher.map(z => z.name)).toEqual(vorher);      // Reihenfolge unveraendert
    expect(nachher[1].start).toBe(true);                    // getippte Zeile ist markiert
    expect(nachher[0].start).toBe(false);                   // Gesamt nicht mehr
    await act(async () => h.root.unmount());
  });

  it("markiert danach das gewaehlte Konto statt Gesamt", async () => {
    const h = await heroAufbauen();
    await h.menueOeffnen();
    await h.klick(h.sterne()[1]);
    expect(h.zeilen().filter(z => z.start)).toHaveLength(1);
    // Die neue Reihenfolge greift beim NAECHSTEN Oeffnen: dann steht das
    // Startkonto oben (siehe startKonto.test.js).
    await h.menueOeffnen();                 // schliessen
    await h.menueOeffnen();                 // neu oeffnen
    expect(h.zeilen()[0]).toEqual({ name: "Giro", start: true });
    await act(async () => h.root.unmount());
  });
});
