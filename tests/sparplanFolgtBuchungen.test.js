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
// Der erste Anlauf dagegen horchte auf `txs` — und konnte gar nicht greifen:
// Das Widget ist nur eingehaengt, solange das Sparen-Panel OFFEN ist (siehe
// DashboardScreenV2). Eine Vormerkung legt man bei GESCHLOSSENEM Panel an; es
// gibt also niemanden, der etwas mitbekommt. Beim naechsten Oeffnen startet die
// Komponente frisch, liest die gespeicherte Tabelle und hat keinen Anhalt, dass
// sie veraltet ist. Genau daran scheiterte der erste Fix in der echten App,
// waehrend der Test gruen war — er liess das Widget die ganze Zeit eingehaengt.
//
// Deshalb bildet dieser Test den LEBENSZYKLUS nach: oeffnen, schliessen
// (unmount), Buchung anlegen, wieder oeffnen. Die Tabelle ueberlebt im
// kvStore — genau wie in der App.

import { describe, it, expect, beforeAll } from "vitest";
import { THEMES } from "../src/theme/themes.js";
import { setActiveTheme, theme as T } from "../src/theme/activeTheme.js";
import { knopfPaar, HELL, kontrastWert } from "../src/theme/amtPill.js";
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

    // OHNE init() faellt kvStore auf localStorage zurueck und die gespeicherte
    // Tabelle ueberlebt den Wechsel nicht — dann rechnet das Widget beim
    // zweiten Oeffnen ohnehin neu und der Test bewiese nichts.
    await kvStore.init();
    kvStore.setItem("mbt_sparen_monate", "3");
    kvStore.setItem("mbt_spar_planname", "Sparplan 1");
    kvStore.removeItem("mbt_spar_result");

    // Panel oeffnen: einhaengen, rechnen lassen, ablesen, wieder aushaengen.
    const oeffneUndLies = async (txs) => {
      const el = document.createElement("div");
      document.body.appendChild(el);
      const root = createRoot(el);
      await act(async () => {
        root.render(React.createElement(AppCtx.Provider, { value: machCtx(txs) },
          React.createElement(TagesgeldWidget, { year: JAHR, month: MONAT, initialCollapsed: false })));
      });
      // Die Vorschau rechnet in requestAnimationFrame-Haeppchen, die
      // Neuberechnung zusätzlich mit 450 ms Verzögerung.
      await act(async () => { await new Promise((r) => setTimeout(r, 1400)); });
      const raten = ratenAus(el);
      await act(async () => { root.unmount(); });
      el.remove();
      return raten;
    };

    const vorher = await oeffneUndLies(grundBestand());
    expect(vorher.length, "die Vorschau muss Raten zeigen").toBeGreaterThan(0);

    // Panel ist jetzt ZU. Genau so legt man eine Vormerkung an — und genau
    // deshalb reicht ein Effekt auf `txs` nicht.
    const nachher = await oeffneUndLies([...grundBestand(), brocken]);

    expect(nachher, "die Vorschau muss sich geändert haben").not.toEqual(vorher);
    expect(nachher[0], "die Rate des laufenden Monats muss sinken")
      .toBeLessThan(vorher[0]);
  }, 20000);

  it("sagt sofort oben, dass es rechnet — und schaltet die alte Ansicht unscharf", async () => {
    // Der Fortschritt stand nur AUF dem Neuberechnen-Knopf, und der sitzt weit
    // unten: „muss sonst erst weit nach unten scrollen, um es ueberhaupt zu
    // erkennen" (Nutzer). Seit die Vorschau von selbst nachrechnet, ist das die
    // haeufigste Art, wie man ihr begegnet.
    const { kvStore } = await import("../src/utils/kvStore.js");
    const { TagesgeldWidget } = await import("../src/components/organisms/TagesgeldWidget.jsx");
    const { AppCtx } = await import("../src/state/AppContext.js");

    await kvStore.init();
    kvStore.setItem("mbt_sparen_monate", "3");
    kvStore.setItem("mbt_spar_planname", "Sparplan 1");
    kvStore.removeItem("mbt_spar_result");

    const zeige = async (txs) => {
      const el = document.createElement("div");
      document.body.appendChild(el);
      const root = createRoot(el);
      await act(async () => {
        root.render(React.createElement(AppCtx.Provider, { value: machCtx(txs) },
          React.createElement(TagesgeldWidget, { year: JAHR, month: MONAT, initialCollapsed: false })));
      });
      return { el, root };
    };

    // Erst einen Stand erzeugen …
    const a = await zeige(grundBestand());
    await act(async () => { await new Promise((r) => setTimeout(r, 1400)); });
    await act(async () => { a.root.unmount(); });
    a.el.remove();

    // … dann mit geaenderten Buchungen wieder oeffnen.
    const b = await zeige([...grundBestand(), brocken]);

    expect(b.el.textContent, "die Meldung muss sofort dastehen")
      .toContain("wird neu berechnet");
    const oben = b.el.textContent.indexOf("wird neu berechnet");
    const tabelle = b.el.textContent.indexOf("Tiefst-Saldo");
    expect(oben, "und zwar VOR der Tabelle").toBeLessThan(tabelle < 0 ? Infinity : tabelle);
    expect(b.el.querySelector('[style*="blur"]'), "die alte Ansicht wird unscharf")
      .toBeTruthy();

    // Ist sie fertig, verschwindet beides wieder.
    await act(async () => { await new Promise((r) => setTimeout(r, 1400)); });
    expect(b.el.textContent).not.toContain("wird neu berechnet");
    expect(b.el.querySelector('[style*="blur"]')).toBeNull();

    await act(async () => { b.root.unmount(); });
    b.el.remove();
  }, 20000);

  it("stürzt in einem KÜNFTIGEN Monat nicht ab", async () => {
    // Gemeldet als roter Vollbild-Crash beim Tippen aufs Sparschwein:
    // „ReferenceError: Cannot access 'qn' before initialization".
    //
    // Der fruehe Ausstieg `if(!isCurr) return null` stand VOR der Deklaration
    // von `berechnen`. In einem kuenftigen Monat brach der Rumpf dort ab, die
    // const wurde nie initialisiert — die Effekte waren aber laengst
    // registriert und riefen sie trotzdem. Klassische TDZ.
    //
    // Kein Test konnte das sehen: `app_boot` rendert die App, aber dieses
    // Widget haengt nur im Baum, solange das Sparen-Panel offen ist, und die
    // Render-Tests darueber liefen alle im LAUFENDEN Monat.
    const { kvStore } = await import("../src/utils/kvStore.js");
    const { TagesgeldWidget } = await import("../src/components/organisms/TagesgeldWidget.jsx");
    const { AppCtx } = await import("../src/state/AppContext.js");
    await kvStore.init();
    // OHNE das greift der Auto-Load nicht (er steigt bei vorhandener Tabelle
    // aus) und der Absturz waere zufaellig nicht zu sehen.
    kvStore.removeItem("mbt_spar_result");
    kvStore.setItem("mbt_spar_planname", "Sparplan 1");

    const fehler = [];
    const alt = window.onerror;
    window.addEventListener("error", (e) => fehler.push(String(e.error || e.message)));

    // Zwei Monate weiter — genau der Fall aus dem Bild (Okt statt Aug).
    const idx = MONAT + 2, kM = idx % 12, kJ = JAHR + Math.floor(idx / 12);
    const el = document.createElement("div");
    document.body.appendChild(el);
    const root = createRoot(el);
    await act(async () => {
      root.render(React.createElement(AppCtx.Provider, { value: machCtx(grundBestand()) },
        React.createElement(TagesgeldWidget, { year: kJ, month: kM, initialCollapsed: false })));
    });
    // Die Effekte laufen nach dem Rendern; der Absturz kam aus ihnen, nicht
    // aus dem Render — deshalb muss hier wirklich gewartet werden.
    await act(async () => { await new Promise((r) => setTimeout(r, 1400)); });

    expect(fehler, `Absturz: ${fehler.join(" | ")}`).toEqual([]);
    // Und im kuenftigen Monat zeigt das Widget bewusst nichts.
    expect(el.textContent.trim()).toBe("");

    await act(async () => { root.unmount(); });
    el.remove();
    window.onerror = alt;
  }, 20000);

  it("die Schrift auf dem Statusband trägt in jedem Theme", () => {
    // Dieselbe Rechnung wie im Widget (`rechnePaar`). Ein Band, das man nicht
    // lesen kann, ist keine Meldung.
    const schwach = [];
    Object.keys(THEMES).forEach((name) => {
      setActiveTheme(name);
      const { grund, schrift } = knopfPaar(T.blue, HELL);
      const wert = kontrastWert(schrift, grund);
      if (wert < 4.5) schwach.push(`${name}: ${wert.toFixed(2)}:1`);
    });
    expect(schwach, `zu schwach — ${schwach.join(", ")}`).toEqual([]);
  });
});
