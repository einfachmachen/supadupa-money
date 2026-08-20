// WELCHE Sparrate fängt eine Schieflage ab?
//
// Bisher immer die des LAUFENDEN Monats: `computeSafeCurrentMonthAmount`
// kennt genau einen Stellknopf und prüft damit den ganzen Horizont. Eine
// Schieflage im Januar senkte also schon im August die Sparrate.
//
// Der Wunsch war, das zu vermeiden („so viel wie möglich sparen, besonders in
// den Monaten mit der Super-Sparrate"). Beim Durchrechnen kam eine unbequeme
// Wahrheit heraus, und die hält der letzte Test hier fest:
//
//   Solange gespartes Geld nur in EINE Richtung fließt, ist die erste Rate
//   zwangsläufig durch das engste künftige Fenster begrenzt. Formal: mit
//   `P_i` = Summe der Raten bis i und `K_i` = Kapazität von Fenster i gilt
//   `P_i ≤ K_i` und `P` steigt monoton, also `P_i = min(K_i … K_n)`.
//
// Was der Umbau trotzdem bringt: Die Kürzung verteilt sich richtig. Steigt
// die Kapazität später wieder, steigen auch die späteren Raten wieder —
// vorher trug der laufende Monat die ganze Kürzung allein, während die
// künftigen Raten unangetastet zu hoch stehen blieben.
//
// `computeSafeAmountForAbgang` (eine Rate, ihr eigenes Fenster) gibt es
// weiterhin — `sparHilfeFuerEngpass` beantwortet damit die Frage „welche Rate
// ist für DIESEN Engpass zuständig". Für den PLAN rechnet `sparPlanOptimum`.

import { describe, it, expect } from "vitest";
import { sparAbgaenge, minImFenster, computeSafeAmountForAbgang, sparRatenAbgleich, sparPlanOptimum }
  from "../src/utils/sparBerechnen.js";

// Der Anker gilt NUR fuer den Vormonat des Szenarios (Juli 2026). Fuer alle
// spaeteren Monate liefert `getKumulierterSaldo` bewusst `null`, damit die
// App den Saldo selbst fortschreibt (saldoEnde) — sonst startete jeder Monat
// wieder beim Anker, und ein Engpass im Januar waere gar nicht darstellbar.
// Aus demselben Grund KEIN `getProgEndeAccGlobal`: der wuerde die
// Fortschreibung ebenfalls kurzschliessen.
function buildCtx({ txs, anker }) {
  return {
    txs,
    cats: [],
    accounts: [{ id: "acc-giro", name: "Giro" }],
    getKumulierterSaldo: (y, m) => (y === 2026 && m === 6 ? anker : null),
    getCat: () => null,
    getBudgetForMonth: () => 0,
  };
}

const rate = (id, datum, betrag) => ({
  id, accountId: "acc-giro", date: datum, totalAmount: -betrag, pending: true,
  _csvType: "expense", desc: "Sparen·Tagesgeld", _seriesId: "s1",
  splits: [{ id: id + "-s", catId: "", subId: "", amount: -betrag }],
});
const ausgabe = (id, datum, betrag) => ({
  id, accountId: "acc-giro", date: datum, totalAmount: -betrag, pending: true,
  _csvType: "expense", splits: [],
});
const einnahme = (id, datum, betrag) => ({
  id, accountId: "acc-giro", date: datum, totalAmount: betrag, pending: true,
  _csvType: "income", splits: [],
});

describe("Sparraten: jede Rate haftet nur bis zur nächsten", () => {
  const today = new Date("2026-08-20");
  const puffer = 100;

  it("Engpass VOR dem Termin: die Rate DAVOR muss ran, nicht die des Monats", () => {
    // Anker 2000 zum Monatsende Juli. Im Januar fällt der Saldo am 5. tief;
    // die Januar-Rate geht erst am 28. ab und kann daran nichts ändern.
    const txs = [
      rate("r-08", "2026-08-28", 500),
      rate("r-12", "2026-12-28", 500),
      rate("r-01", "2027-01-28", 500),
      ausgabe("gross", "2027-01-05", 1400),
      // Rueckfluss VOR dem Januar-Termin. Ohne ihn waere nach dem 5.1. fuer
      // jede spaetere Rate ohnehin nichts mehr da, und der Fall zeigte nichts.
      einnahme("rueck", "2027-01-20", 1500),
    ];
    const ctx = buildCtx({ txs, anker: 2000 });

    const raten = sparAbgaenge(txs, "2026-08-01");
    expect(raten.map((r) => r.id)).toEqual(["r-08", "r-12", "r-01"]);

    // Die Januar-Rate sieht in IHREM Fenster (ab 28.01.) den 5. Januar gar
    // nicht mehr — sie bleibt also unangetastet hoch.
    const jan = computeSafeAmountForAbgang({
      abgang: txs.find((t) => t.id === "r-01"), bisIso: null, puffer, ctx, today,
    });
    expect(jan, "Januar-Rate darf nicht fuer den 5.1. bluten").toBeGreaterThan(0);

    // Die Dezember-Rate ist zuständig: ihr Fenster (28.12. – 28.01.) enthält
    // den 5. Januar.
    const dez = computeSafeAmountForAbgang({
      abgang: txs.find((t) => t.id === "r-12"), bisIso: "2027-01-28", puffer, ctx, today,
    });
    expect(dez, "Dezember-Rate muss den 5.1. abfangen").toBeLessThan(500);
  });

  it("die Rate des laufenden Monats bleibt von einem fernen Engpass unberührt", () => {
    // Das ist der Kern der Entscheidung: Der Engpass liegt im Januar, die
    // August-Rate wird trotzdem nicht angefasst — ihr Fenster endet am
    // nächsten Sparplan-Termin.
    const txs = [
      rate("r-08", "2026-08-28", 500),
      rate("r-09", "2026-09-28", 500),
      rate("r-12", "2026-12-28", 500),
      ausgabe("gross", "2027-01-05", 1400),
    ];
    const ctx = buildCtx({ txs, anker: 2000 });
    const aug = computeSafeAmountForAbgang({
      abgang: txs.find((t) => t.id === "r-08"), bisIso: "2026-09-28", puffer, ctx, today,
    });
    expect(aug, "August-Rate darf wegen Januar nicht sinken").toBeGreaterThanOrEqual(500);
  });

  it("belegt den Unterschied: mit dem ALTEN Fenster (ganzer Horizont) sinkt sie", () => {
    // Ohne Fenstergrenze prüft dieselbe Rechnung bis ans Ende — und dann
    // trifft es die August-Rate. Genau das war das gemeldete Verhalten.
    const txs = [
      rate("r-08", "2026-08-28", 500),
      rate("r-09", "2026-09-28", 500),
      rate("r-12", "2026-12-28", 500),
      ausgabe("gross", "2027-01-05", 1400),
    ];
    const ctx = buildCtx({ txs, anker: 2000 });
    const ohneFenster = computeSafeAmountForAbgang({
      abgang: txs.find((t) => t.id === "r-08"), bisIso: null, puffer, ctx, today,
    });
    expect(ohneFenster).toBeLessThan(500);
  });

  it("minImFenster zählt nur Tage im Fenster", () => {
    const txs = [ausgabe("a", "2026-09-10", 5000), einnahme("b", "2026-09-20", 5000)];
    const ctx = buildCtx({ txs, anker: 2000 });
    // Fenster endet VOR der Delle → sie zählt nicht.
    const vorher = minImFenster("2026-08-28", "2026-09-10", "acc-giro", ctx, today, 12);
    expect(vorher).toBeGreaterThan(0);
    // Fenster über die Delle → sie zählt.
    const drueber = minImFenster("2026-08-28", "2026-09-21", "acc-giro", ctx, today, 12);
    expect(drueber).toBeLessThan(0);
  });

  it("mehrere Sparbuchungen in einem Monat: dieser Monat wird ausgelassen", () => {
    // Bei zwei Plänen im selben Monat ist nicht zu erkennen, welcher gemeint
    // ist — dieselbe Eindeutigkeits-Bedingung wie bisher.
    const txs = [
      rate("r-08a", "2026-08-10", 300),
      rate("r-08b", "2026-08-28", 200),
      rate("r-09", "2026-09-28", 500),
    ];
    expect(sparAbgaenge(txs, "2026-08-01").map((r) => r.id)).toEqual(["r-09"]);
  });

  it("das Suffix-Minimum haelt den Puffer — auch wenn ein Fenster spaeter klemmt", () => {
    // Der Fall, an dem sich die Rechnung entscheidet: Das eigene Fenster der
    // August-Rate (28.08.–28.09.) sieht die Miete vom 2.10. gar nicht und
    // wuerde 1900 erlauben. Das Fenster danach klemmt aber, und die
    // September-Rate steht schon bei 0 — sie kann nichts mehr ausrichten.
    //
    // Das Suffix-Minimum faengt genau das ab: die August-Rate wird durch das
    // ENGSTE kuenftige Fenster begrenzt, nicht durch ihr eigenes.
    const txs = [
      rate("r-08", "2026-08-28", 0),
      rate("r-09", "2026-09-28", 0),
      ausgabe("miete", "2026-10-02", 1800),
    ];
    const ctx = buildCtx({ txs, anker: 2000 });
    const opt = sparPlanOptimum({ txs, puffer, ctx, today, abDatumIso: "2026-08-01" });
    const aug = opt.get("r-08") ?? 0;
    const sep = opt.get("r-09") ?? 0;

    expect(2000 - aug - sep - 1800, `aug=${aug} sep=${sep}`).toBeGreaterThanOrEqual(puffer);
    const nurEigenesFenster = computeSafeAmountForAbgang({
      abgang: txs.find((t) => t.id === "r-08"), bisIso: "2026-09-28", puffer, ctx, today,
    });
    expect(nurEigenesFenster, "Beleg: das eigene Fenster allein erlaubt mehr").toBeGreaterThan(aug);
  });

  it("spaetere Raten steigen wieder, wenn die Kapazitaet zurueckkommt", () => {
    // Das ist der echte Gewinn gegenueber „immer der laufende Monat": Ein
    // Engpass im Oktober begrenzt August und September — danach ist wieder
    // Luft, und die November-Rate darf sie nutzen. Vorher blieben die
    // kuenftigen Raten unangetastet stehen, und der laufende Monat trug die
    // ganze Kuerzung.
    const txs = [
      rate("r-08", "2026-08-28", 0),
      rate("r-09", "2026-09-28", 0),
      rate("r-11", "2026-11-28", 0),
      ausgabe("miete", "2026-10-02", 1700),
      einnahme("bonus", "2026-11-05", 2500),
    ];
    const ctx = buildCtx({ txs, anker: 2000 });
    const opt = sparPlanOptimum({ txs, puffer, ctx, today, abDatumIso: "2026-08-01" });
    const nov = opt.get("r-11") ?? 0;
    expect(nov, "die November-Rate muss den Bonus nutzen duerfen").toBeGreaterThan(0);
    // Und die Summe haelt an jedem Fenster den Puffer.
    const summeBisOkt = (opt.get("r-08") ?? 0) + (opt.get("r-09") ?? 0);
    expect(2000 - summeBisOkt - 1700).toBeGreaterThanOrEqual(puffer);
  });

  it("Raten sind nie negativ und die Summe steigt monoton", () => {
    const txs = [
      rate("r-08", "2026-08-28", 0),
      rate("r-09", "2026-09-28", 0),
      rate("r-10", "2026-10-28", 0),
      ausgabe("delle", "2026-09-10", 1500),
    ];
    const ctx = buildCtx({ txs, anker: 2000 });
    const opt = sparPlanOptimum({ txs, puffer, ctx, today, abDatumIso: "2026-08-01" });
    let summe = 0;
    ["r-08", "r-09", "r-10"].forEach((id) => {
      const b = opt.get(id) ?? 0;
      expect(b, `${id} negativ`).toBeGreaterThanOrEqual(0);
      summe += b;
    });
    expect(summe).toBeGreaterThanOrEqual(0);
  });

  it("sparRatenAbgleich liefert nur die Raten, die sich wirklich ändern", () => {
    const txs = [
      rate("r-08", "2026-08-28", 500),
      rate("r-12", "2026-12-28", 500),
      rate("r-01", "2027-01-28", 500),
      ausgabe("gross", "2027-01-05", 1400),
      einnahme("rueck", "2027-01-20", 1500),
    ];
    const ctx = buildCtx({ txs, anker: 2000 });
    const aend = sparRatenAbgleich({ txs, puffer, ctx, today, abDatumIso: "2026-08-01" });
    const betroffen = aend.map((a) => a.abgang.id);
    expect(betroffen, "die Dezember-Rate muss dabei sein").toContain("r-12");
    // Und die August-Rate darf NICHT gesenkt werden.
    const august = aend.find((a) => a.abgang.id === "r-08");
    if (august) expect(august.neu).toBeGreaterThanOrEqual(august.alt);
  });
});
