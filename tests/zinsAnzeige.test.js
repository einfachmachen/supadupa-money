// Der Zinsvergleich im Sparplan — durch die ganze Kette gerendert.
//
// Die Rechnung selbst steht in zinsErtrag.test.js. Hier geht es um das, was
// dazwischen liegt und wo es in diesem Bauteil schon mehrfach geklemmt hat:
// Der Zinssatz kommt aus dem kvStore, der Stichtagssaldo aus derselben
// Buchungs-Grundlage wie der Sweep, der Zeitraum aus den eingestellten
// Zinsmonaten — und ganz am Ende soll eine Zeile im Bildschirm stehen.
//
// Besonders die Grundlage ist heikel: Der Tagesgeld-Stand am Stichtag setzt
// sich aus dem gebuchten Bestand UND den geplanten Raten zusammen. Würde der
// gebuchte Bestand die Plan-Raten schon enthalten, wären sie doppelt gezählt.
// Deshalb rechnet die Anzeige auf `sweepCtx` — dem Bestand OHNE die Raten
// dieses Plans.

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

// Gehalt am Ersten, eine bestehende Sparplan-Serie, ein Tagesgeldkonto — und
// eine große Ausgabe im letzten Vorschaumonat.
//
// Die Ausgabe ist nicht Beiwerk, sondern die Voraussetzung: Ohne sie schöpft
// der Sparplan jeden Monat bis auf den Puffer ab, am Monatsletzten liegt
// nichts mehr auf dem Giro — und dann gibt es gar keine Mega-Sparrate, über
// deren Zinsen zu reden wäre (`sweepFuerMonat` gibt null zurück). Erst ein
// enger Monat WEITER HINTEN deckelt die laufende Rate und lässt zum Stichtag
// etwas übrig. Genau so sieht Dirks echter Plan aus.
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
  const idx3 = MONAT + 3, m3 = idx3 % 12, y3 = JAHR + Math.floor(idx3 / 12);
  out.push({ id: "gross", accountId: "acc-giro", date: `${y3}-${pad(m3 + 1)}-15`,
    totalAmount: -15000, pending: true, _csvType: "expense", desc: "Auto",
    splits: [{ id: "g1", catId: "", subId: "", amount: -15000 }] });
  return out;
}

function machCtx(txs) {
  return {
    txs, setTxs: () => {}, cats: [],
    accounts: [{ id: "acc-giro", name: "Giro", minPuffer: 100 },
               { id: "acc-tg", name: "Tagesgeld" }],
    setAccounts: () => {}, getAcc: (id) => ({ id, name: id }), budgets: {},
    // Startsaldo des Vormonats: Giro wie Tagesgeld. Fuer das Tagesgeld ist das
    // der Bestand, auf den die Zinsen laufen.
    getKumulierterSaldo: (y, m) =>
      ((y === JAHR && m === MONAT - 1) || (MONAT === 0 && m === 11) ? 5000 : null),
    getCat: () => null, getBudgetForMonth: () => 0, selAcc: "acc-giro",
    getProgEndeAccGlobal: undefined, resetProgEndeCache: () => {}, sparOpenRequest: 0,
    frageBestaetigung: () => {},
  };
}

// Wie oben, aber der Baum bleibt stehen — für den Test, der IM Bildschirm
// weitertippt.
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

describe("Zinsvergleich im Sparplan", () => {
  it("ohne Zinssatz steht nichts von Zinsen da", async () => {
    // Leer heißt „nicht eingetragen", nicht „0 %". Eine Zeile mit 0,00 € wäre
    // eine Behauptung über ein Konto, über das die App nichts weiß.
    const text = await zeige({ mbt_zins_satz: "" });
    expect(text).not.toContain("Zinsen am");
  }, 20000);

  it("mit Zinssatz stehen beide Beträge und die Differenz da", async () => {
    const text = await zeige({ mbt_zins_satz: "2" });
    expect(text, "die Zinszeile fehlt").toContain("Zinsen am");
    // „X € statt Y €" — die Gegenüberstellung, um die der Nutzer gebeten hat.
    expect(text).toMatch(/Zinsen am [\d.]+:\s*[\d.,]+ €\s*statt\s*[\d.,]+ €/);
    // Und ein Gewinn, kein 0,00 €: Bei 5.000 € Bestand und 2 % muss etwas
    // herauskommen, sonst rechnet die Kette auf einem leeren Saldo.
    const treffer = text.match(/statt\s*([\d.]+,\d\d) €\s*—\s*\+([\d.]+,\d\d) €/);
    expect(treffer, `keine verwertbare Zinszeile in: ${text.slice(0, 400)}`).toBeTruthy();
    const zahl = (s) => Number(s.replace(/\./g, "").replace(",", "."));
    expect(zahl(treffer[1]), "Zins ohne Mega-Sparrate").toBeGreaterThan(0);
    expect(zahl(treffer[2]), "Gewinn durch die Mega-Sparrate").toBeGreaterThan(0);
  }, 20000);

  it("ein geänderter Zinssatz rechnet die Tabelle nach — und lässt sie nicht unscharf stehen", async () => {
    // Die Falle: Ein `setResultOutdated(true)` allein schaltet die Ansicht
    // unscharf und blendet „wird neu berechnet" ein — aber NACHGERECHNET wird
    // nur, wenn sich der Daten-Abdruck ändert. Seit der „Neuberechnen"-Knopf
    // weg ist, gibt es niemanden mehr, der die Meldung einlöst: Die Tabelle
    // bliebe für immer unscharf unter einem Versprechen stehen.
    const { el, root } = await oeffne({ mbt_zins_satz: "2" });
    const vorher = el.textContent || "";
    expect(vorher).toContain("Zinsen am");

    const feld = [...el.querySelectorAll("input")]
      .find((i) => i.placeholder && i.placeholder.includes("2,25"));
    expect(feld, "das Zinssatz-Feld muss es geben").toBeTruthy();
    await tippe(feld, "4");
    // 450 ms Sammelpause plus Rechenzeit.
    await act(async () => { await new Promise((r) => setTimeout(r, 1600)); });
    const nachher = el.textContent || "";

    expect(nachher, "die Meldung muss eingelöst sein").not.toContain("wird neu berechnet");
    expect(nachher, "die Zinszeile muss noch da sein").toContain("Zinsen am");
    expect(nachher, "und einen anderen Betrag zeigen").not.toBe(vorher);
    // Doppelter Zinssatz, doppelter Zins — der beste Beleg, dass wirklich neu
    // gerechnet wurde und nicht bloß neu gezeichnet.
    const zins = (t) => Number((t.match(/—\s*\+([\d.]+,\d\d) €/) || [])[1]
      ?.replace(/\./g, "").replace(",", "."));
    expect(zins(nachher)).toBeCloseTo(zins(vorher) * 2, 1);

    await act(async () => { root.unmount(); });
    el.remove();
  }, 20000);

  it("der taggenaue Gegenwert steht daneben — nicht nur der schöne Fall", async () => {
    // Die Mega-Sparrate lohnt sich NUR, wenn die Bank den Stand am Stichtag
    // verzinst. Rechnet sie taggenau (bei Tagesgeld verbreitet), bleiben von
    // einem Quartal ein bis zwei Tage übrig. Wer nur die erste Zahl sieht,
    // verschiebt Tausende für ein paar Cent, ohne es zu merken.
    const text = await zeige({ mbt_zins_satz: "2" });
    expect(text, "der Hinweis auf das Zinsmodell fehlt").toContain("taggenau");
    expect(text).toContain("Stand am Stichtag");
  }, 20000);
});
