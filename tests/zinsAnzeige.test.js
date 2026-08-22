// Die Zinsvorschau — durch die ganze Kette gerendert.
//
// Die Rechnung selbst steht in zinsPlan.test.js. Hier geht es um das, was
// dazwischen liegt und wo es in diesem Bauteil schon mehrfach geklemmt hat:
// Der Zinssatz kommt aus dem kvStore, der Anfangssaldo aus dem
// Buchungsbestand, die Bewegungen aus den GEPLANTEN Raten (die noch in keiner
// Buchung stehen), die Termine aus den eingestellten Zinsmonaten — und ganz am
// Ende soll eine Zeile im Bildschirm stehen.
//
// Der heikelste Punkt ist die Grundlage: Der Tagesgeld-Verlauf setzt sich aus
// dem gebuchten Bestand UND den geplanten Raten zusammen. Stünden die Raten in
// beidem, wären sie doppelt gezählt.

import { describe, it, expect, beforeAll } from "vitest";
import "fake-indexeddb/auto";
import React from "react";
import { createRoot } from "react-dom/client";
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

// Gehalt am Ersten, eine bestehende Sparplan-Serie, ein Tagesgeldkonto.
function bestand() {
  const out = [];
  for (let i = 0; i < 4; i++) {
    const idx = MONAT + i, m = idx % 12, y = JAHR + Math.floor(idx / 12);
    out.push({ id: `inc-${i}`, accountId: "acc-giro", date: `${y}-${pad(m + 1)}-01`,
      totalAmount: 4000, pending: true, _csvType: "income", splits: [] });
    out.push({ id: `spar-${i}`, accountId: "acc-giro", date: letzter(y, m),
      totalAmount: -100, pending: true, _csvType: "expense", desc: "Sparen·Sparplan 1",
      _seriesId: "s1", splits: [{ id: `sp${i}`, catId: "", subId: "", amount: -100 }] });
  }
  return out;
}

function machCtx(txs, setTxs = () => {}, frageBestaetigung = () => {}) {
  return {
    txs, setTxs, cats: [],
    accounts: [{ id: "acc-giro", name: "Giro", minPuffer: 100 },
               { id: "acc-tg", name: "Tagesgeld" }],
    setAccounts: () => {}, getAcc: (id) => ({ id, name: id }), budgets: {},
    // Startsaldo des Vormonats — für das Tagesgeld der Bestand, auf den die
    // Zinsen laufen.
    getKumulierterSaldo: (y, m) =>
      ((y === JAHR && m === MONAT - 1) || (MONAT === 0 && m === 11) ? 10000 : null),
    getCat: () => null, getBudgetForMonth: () => 0, selAcc: "acc-giro",
    getProgEndeAccGlobal: undefined, resetProgEndeCache: () => {}, sparOpenRequest: 0,
    frageBestaetigung,
  };
}

const oeffne = async (kv) => {
  const { kvStore } = await import("../src/utils/kvStore.js");
  const { TagesgeldWidget } = await import("../src/components/organisms/TagesgeldWidget.jsx");
  const { AppCtx } = await import("../src/state/AppContext.js");
  await kvStore.init();
  kvStore.setItem("mbt_sparen_monate", "3");
  kvStore.setItem("mbt_spar_planname", "Sparplan 1");
  kvStore.setItem("mbt_spar_accid", "acc-tg");
  // JEDER Monat ist Zinsmonat — so liegt der nächste Termin sicher innerhalb
  // des kurzen Vorschau-Zeitraums, und der Test wartet nicht auf ein Quartal.
  kvStore.setItem("mbt_zins_monate", "0,1,2,3,4,5,6,7,8,9,10,11");
  kvStore.setItem("mbt_zins_basis", "365");
  kvStore.removeItem("mbt_spar_result");
  Object.entries(kv || {}).forEach(([k, v]) => kvStore.setItem(k, v));

  const el = document.createElement("div");
  document.body.appendChild(el);
  const root = createRoot(el);
  await act(async () => {
    root.render(React.createElement(AppCtx.Provider, { value: machCtx(bestand()) },
      React.createElement(TagesgeldWidget, { year: JAHR, month: MONAT, initialCollapsed: false })));
  });
  await act(async () => { await new Promise((r) => setTimeout(r, 1600)); });
  return { el, root };
};

const zeige = async (kv) => {
  const { el, root } = await oeffne(kv);
  const text = el.textContent || "";
  await act(async () => { root.unmount(); });
  el.remove();
  return text;
};

// In ein <input> tippen, wie React es mitbekommt: Der Wert muss über den
// nativen Setter gesetzt werden, sonst schluckt Reacts eigener Setter das
// Ereignis als „nichts geändert".
const tippe = async (input, wert) => {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype, "value").set;
  await act(async () => {
    setter.call(input, wert);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

const zahl = (s) => Number(String(s).replace(/\./g, "").replace(",", "."));

describe("Zinsvorschau im Sparplan", () => {
  it("ohne Zinssatz steht nichts von Zinsen da", async () => {
    // Leer heißt „nicht eingetragen", nicht „0 %". Eine Zeile mit 0,00 € wäre
    // eine Behauptung über ein Konto, über das die App nichts weiß.
    const text = await zeige({ mbt_zins_satz: "" });
    expect(text).not.toContain("Zinsgutschrift");
  }, 20000);

  it("mit Zinssatz steht die nächste Gutschrift da", async () => {
    const text = await zeige({ mbt_zins_satz: "2" });
    expect(text, "die Zinszeile fehlt").toContain("Zinsgutschrift am");
    const treffer = text.match(/Zinsgutschrift am [\d.]+:\s*([\d.]+,\d\d) €/);
    expect(treffer, `keine verwertbare Zinszeile in: ${text.slice(0, 500)}`).toBeTruthy();
    // 10.000 € zu 2 % bringen im Monat gut 16 € — jedenfalls mehr als nichts.
    expect(zahl(treffer[1])).toBeGreaterThan(0);
  }, 20000);

  it("die Gutschrift steht auch an den Monaten der Tabelle", async () => {
    const text = await zeige({ mbt_zins_satz: "2" });
    expect(text).toMatch(/Zinsen \d\d\.\d\d\.:\s*\+[\d.]+,\d\d €\s*für \d+ Tage/);
  }, 20000);

  it("doppelter Zinssatz, doppelte Gutschrift", async () => {
    // Der Beleg, dass wirklich gerechnet und nicht bloß neu gezeichnet wird —
    // und zugleich, dass die Einstellung die Tabelle nicht unscharf stehen
    // lässt (dafür muss sie im Daten-Abdruck stehen).
    const { el, root } = await oeffne({ mbt_zins_satz: "2" });
    const vorher = (el.textContent || "").match(/Zinsgutschrift am [\d.]+:\s*([\d.]+,\d\d) €/);
    expect(vorher).toBeTruthy();

    const feld = [...el.querySelectorAll("input")]
      .find((i) => i.placeholder && i.placeholder.includes("2,25"));
    expect(feld, "das Zinssatz-Feld muss es geben").toBeTruthy();
    await tippe(feld, "4");
    await act(async () => { await new Promise((r) => setTimeout(r, 1600)); });

    const text = el.textContent || "";
    expect(text, "die Meldung muss eingelöst sein").not.toContain("wird neu berechnet");
    const nachher = text.match(/Zinsgutschrift am [\d.]+:\s*([\d.]+,\d\d) €/);
    expect(nachher).toBeTruthy();
    expect(zahl(nachher[1])).toBeCloseTo(zahl(vorher[1]) * 2, 1);

    await act(async () => { root.unmount(); });
    el.remove();
  }, 20000);

  it("die Jahresbasis wirkt sich aus", async () => {
    // 360 statt 365 sind 1,4 % mehr Zins. Wer die Umschaltung nicht ernst
    // nimmt, rechnet dauerhaft daneben.
    const a = await zeige({ mbt_zins_satz: "2", mbt_zins_basis: "365" });
    const b = await zeige({ mbt_zins_satz: "2", mbt_zins_basis: "360" });
    const lies = (t) => zahl(t.match(/Zinsgutschrift am [\d.]+:\s*([\d.]+,\d\d) €/)[1]);
    expect(lies(b)).toBeGreaterThan(lies(a));
    expect(lies(b) / lies(a)).toBeCloseTo(365 / 360, 2);
  }, 30000);

  it("von der Mega-Sparrate ist im Bildschirm nichts mehr zu sehen", async () => {
    const text = await zeige({ mbt_zins_satz: "2" });
    expect(text).not.toContain("Mega-Sparrate");
    expect(text).not.toContain("zurück aufs Giro");
  }, 20000);
});

// ── Vormerken: die Gutschriften landen als Buchung auf dem Tagesgeld ──────
//
// „Dennoch wäre es schön, die zu erwartenden Zinsen mit zu berechnen und
// vorzumerken." Anzeigen allein reicht nicht: Erst als Vormerkung zählen sie
// im Saldo, im Monat und in der Prognose. Über ein paar Jahre ist das ein
// dreistelliger Betrag, der sonst schlicht fehlt.
//
// Der Test fährt den echten Weg: Der Plan wird gelöscht (dann zeigt der Knopf
// wieder das Plus) und neu angelegt. Dafür hält eine kleine Hülle die
// Buchungen wirklich im Zustand — mit einem Spion allein ginge es nicht, weil
// der zweite Schritt den ersten schon sehen muss.
describe("Zinsgutschriften vormerken", () => {
  const HuelleBauen = (TagesgeldWidget, AppCtx, start, gesehen) => function Huelle() {
    const [txs, setTxs] = React.useState(start);
    gesehen.current = txs;
    const ctx = machCtx(txs, (f) => setTxs((p) => (typeof f === "function" ? f(p) : f)),
      (frage, onJa) => onJa());
    return React.createElement(AppCtx.Provider, { value: ctx },
      React.createElement(TagesgeldWidget, { year: JAHR, month: MONAT, initialCollapsed: false }));
  };

  it("Löschen nimmt sie mit, Anlegen schreibt sie neu", async () => {
    const { kvStore } = await import("../src/utils/kvStore.js");
    const { TagesgeldWidget } = await import("../src/components/organisms/TagesgeldWidget.jsx");
    const { AppCtx } = await import("../src/state/AppContext.js");
    await kvStore.init();
    kvStore.setItem("mbt_sparen_monate", "3");
    kvStore.setItem("mbt_spar_planname", "Sparplan 1");
    kvStore.setItem("mbt_spar_accid", "acc-tg");
    kvStore.setItem("mbt_zins_monate", "0,1,2,3,4,5,6,7,8,9,10,11");
    kvStore.setItem("mbt_zins_satz", "2");
    kvStore.setItem("mbt_zins_basis", "365");
    kvStore.removeItem("mbt_spar_result");

    const gesehen = { current: null };
    const el = document.createElement("div");
    document.body.appendChild(el);
    const root = createRoot(el);
    await act(async () => {
      root.render(React.createElement(
        HuelleBauen(TagesgeldWidget, AppCtx, bestand(), gesehen)));
    });
    await act(async () => { await new Promise((r) => setTimeout(r, 1600)); });

    const knopf = () => el.querySelector('button[aria-label="Sparplan löschen"]')
      || el.querySelector('button[aria-label="Sparplan anlegen"]');
    expect(knopf()?.getAttribute("aria-label"), "erst der Papierkorb").toBe("Sparplan löschen");
    await act(async () => { knopf().dispatchEvent(new MouseEvent("click", { bubbles: true })); });
    await act(async () => { await new Promise((r) => setTimeout(r, 1600)); });

    expect(knopf()?.getAttribute("aria-label"), "jetzt das Plus").toBe("Sparplan anlegen");
    await act(async () => { knopf().dispatchEvent(new MouseEvent("click", { bubbles: true })); });
    await act(async () => { await new Promise((r) => setTimeout(r, 600)); });

    const zinsen = (gesehen.current || []).filter((t) => t._zinsId);
    expect(zinsen.length, "es müssen Zinsgutschriften angelegt worden sein").toBeGreaterThan(0);
    zinsen.forEach((t) => {
      expect(t.accountId, "auf dem Tagesgeldkonto").toBe("acc-tg");
      expect(t.pending, "als Vormerkung").toBe(true);
      expect(t._csvType).toBe("income");
      expect(t.totalAmount, "eine Gutschrift ist positiv").toBeGreaterThan(0);
      expect(t.desc).toBe("Zinsen·Sparplan 1");
      // Am Zinstermin, also am Monatsletzten.
      const [y, m, d] = t.date.split("-").map(Number);
      expect(d).toBe(new Date(y, m, 0).getDate());
    });

    await act(async () => { root.unmount(); });
    el.remove();
  }, 30000);
});
