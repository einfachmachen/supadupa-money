// Der Sparplan muss den Buchungen folgen.
//
// Gemeldet: „Obwohl ich eben zum Test 2.000 € als Tagesgeld-Sparrate vorgemerkt
// habe UND alles sofort in Schieflage gerät, ändert sich gar nichts im Sparplan
// unterm Sparschwein. Das macht so keinen Sinn für mich."
//
// Und es machte auch keinen: Die Vorschau-Tabelle liegt lokal im kvStore, damit
// sie nach einem Neuladen nicht leer ist — und wurde nur neu gerechnet, wenn es
// noch gar keinen Stand gab oder man den Knopf drückte. `resultOutdated` hing
// an genau zwei Dingen: Horizont und Puffer. Eine geänderte BUCHUNG, also das,
// was den Plan überhaupt bewegt, löste nichts aus.
//
// Der Regel-Stempel (VORSCHAU_REGEL) hatte davon nur die eine Hälfte erwischt:
// eine geänderte RECHENREGEL. Die geänderten DATEN blieben liegen.
//
// Dieser Test rendert das Widget wirklich (jsdom, mit Effekten), setzt einen
// gespeicherten Stand voraus und ändert dann die Buchungen — so wie es beim
// Anlegen einer Vormerkung passiert.

import { describe, it, expect, beforeAll } from "vitest";
import "fake-indexeddb/auto";
import React from "react";
import { createRoot } from "react-dom/client";
// `React.act` gibt es seit React 18.3; der Umweg ueber react-dom/test-utils
// ist deprecated und meldet sich bei jedem Lauf.
const act = React.act;

const pad = (n) => String(n).padStart(2, "0");
const heute = new Date();
const JAHR = heute.getFullYear(), MONAT = heute.getMonth();
const letzter = (y, m) => `${y}-${pad(m + 1)}-${pad(new Date(y, m + 1, 0).getDate())}`;

beforeAll(() => {
  if (!globalThis.ResizeObserver) {
    globalThis.ResizeObserver = class { observe(){} unobserve(){} disconnect(){} };
    window.ResizeObserver = globalThis.ResizeObserver;
  }
  if (!window.matchMedia) {
    window.matchMedia = () => ({ matches:false, addEventListener(){}, removeEventListener(){},
      addListener(){}, removeListener(){} });
  }
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
});

// Gehalt am 1. und eine bestehende Sparplan-Serie — ohne sie rechnet das
// Widget beim Oeffnen gar nicht erst (es gaebe ja keinen Plan).
function grundBestand() {
  const out = [];
  for (let i = 0; i < 4; i++) {
    const idx = MONAT + i, m = idx % 12, y = JAHR + Math.floor(idx / 12);
    out.push({ id: `inc-${i}`, accountId: "acc-giro", date: `${y}-${pad(m + 1)}-01`,
      totalAmount: 3000, pending: true, _csvType: "income", splits: [] });
    out.push({ id: `spar-${i}`, accountId: "acc-giro", date: letzter(y, m),
      totalAmount: -100, pending: true, _csvType: "expense", desc: "Sparen·Sparplan 1",
      _seriesId: "s1", splits: [{ id: `sp${i}`, catId: "", subId: "", amount: -100 }] });
  }
  return out;
}
const brocken = { id: "test-2000", accountId: "acc-giro", date: letzter(JAHR, MONAT),
  totalAmount: -2000, pending: true, _csvType: "expense", desc: "Test",
  splits: [{ id: "b1", catId: "", subId: "", amount: -2000 }] };

function machCtx(txs) {
  return {
    txs, setTxs: () => {}, cats: [], accounts: [{ id: "acc-giro", name: "Giro", minPuffer: 100 }],
    setAccounts: () => {}, getAcc: (id) => ({ id, name: "Giro" }), budgets: {},
    getKumulierterSaldo: (y, m) => ((y === JAHR && m === MONAT - 1) || (MONAT === 0 && m === 11) ? 2000 : null),
    getCat: () => null, getBudgetForMonth: () => 0, selAcc: "acc-giro",
    getProgEndeAccGlobal: undefined, resetProgEndeCache: () => {}, sparOpenRequest: 0,
  };
}

// Die Beträge der Spalte „+ Monat" aus dem gerenderten Baum.
//
// Die Obergrenze haelt zusammengelaufene Textknoten heraus: Ein Eltern-<div>
// liefert den Text seiner Kinder hintereinanderweg, und „+5.000" plus „+3.108"
// laese sich sonst als „+50003108".
function ratenAus(el) {
  return [...el.querySelectorAll("div")]
    .map((d) => d.textContent || "")
    .filter((t) => /^\+[\d.]+$/.test(t.trim()))
    .map((t) => Number(t.trim().slice(1).replace(/\./g, "")))
    .filter((n) => Number.isFinite(n) && n < 1e6);
}

describe("Sparplan folgt den Buchungen", () => {
  it("eine neue Ausgabe ändert die Vorschau, ohne dass man den Knopf drückt", async () => {
    const { kvStore } = await import("../src/utils/kvStore.js");
    const { TagesgeldWidget } = await import("../src/components/organisms/TagesgeldWidget.jsx");
    const { AppCtx } = await import("../src/state/AppContext.js");

    kvStore.setItem("mbt_sparen_monate", "3");
    kvStore.setItem("mbt_spar_planname", "Sparplan 1");
    kvStore.removeItem("mbt_spar_result");

    const wurzelEl = document.createElement("div");
    document.body.appendChild(wurzelEl);
    const root = createRoot(wurzelEl);
    const zeige = async (txs) => {
      await act(async () => {
        root.render(React.createElement(AppCtx.Provider, { value: machCtx(txs) },
          React.createElement(TagesgeldWidget, { year: JAHR, month: MONAT, initialCollapsed: false })));
      });
      // Die Vorschau rechnet in requestAnimationFrame-Haeppchen, die
      // Neuberechnung zusätzlich mit 450 ms Verzögerung.
      await act(async () => { await new Promise((r) => setTimeout(r, 1400)); });
    };

    await zeige(grundBestand());
    const vorher = ratenAus(wurzelEl);
    expect(vorher.length, "die Vorschau muss Raten zeigen").toBeGreaterThan(0);

    // Jetzt die Buchung — genau der gemeldete Fall.
    await zeige([...grundBestand(), brocken]);
    const nachher = ratenAus(wurzelEl);

    expect(nachher, "die Vorschau muss sich geändert haben").not.toEqual(vorher);
    expect(nachher[0], "die Rate des laufenden Monats muss sinken")
      .toBeLessThan(vorher[0]);

    await act(async () => { root.unmount(); });
    wurzelEl.remove();
  }, 20000);
});
