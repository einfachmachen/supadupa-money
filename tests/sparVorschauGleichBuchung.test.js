// Der Sparplan zeigt EXAKT den Betrag, der als Giro-Vormerkung steht.
//
// Der gemeldete Widerspruch (Nutzer-Bilder): Sparplan „August 2026 · 103 €",
// Vormerkung „583 €". Die Vorgeschichte dazu steht in der Git-Historie:
//
//   11261788  Die AUTOMATIK bekommt `sparPlanOptimum` (Fenster ab dem Termin
//             der Rate, Suffix-Minimum). Sie schreibt seitdem 583 in die
//             Buchungen — beim Start, ohne Zutun.
//   21a8c964  Die VORSCHAU bekommt dieselbe Funktion. Bis dahin rechnete sie
//             noch nach der alten Regel (Tiefst-Saldo des ganzen Monats) und
//             zeigte deshalb 103.
//
// Zwischen diesen beiden Commits lag genau der Zustand auf dem Bild: eine
// Buchung, die schon nach der neuen Regel geschrieben war, und eine Anzeige,
// die noch nach der alten rechnete. Nicht zwei Sparpläne — ein Plan, zwei
// Rechenstände.
//
// Dieser Test hält fest, dass die beiden Wege dieselbe Zahl liefern, und zwar
// UNABHÄNGIG davon, was gerade in den Buchungen steht: Die Vorschau baut sich
// ihren Stand aus Null-Raten, die Automatik rechnet auf den echten Buchungen.
// Beide müssen dasselbe herausbekommen — sonst driftet die Anzeige wieder von
// dem weg, was die App tatsächlich vormerkt.

import { describe, it, expect } from "vitest";
import { sparPlanOptimum } from "../src/utils/sparBerechnen.js";

const pad = (n) => String(n).padStart(2, "0");
const today = new Date("2026-08-20");
const puffer = 500;
const MONATE = 8;                          // Aug 2026 … Mär 2027
const SPAR_DESC = "Sparen·Tagesgeld";
const AUSGABEN = [2400, 3000, 1800, 2600, 2000, 2900, 2200, 2500];
const letzter = (y, m) => `${y}-${pad(m + 1)}-${pad(new Date(y, m + 1, 0).getDate())}`;
const jm = (i) => { const idx = 7 + i; return [2026 + Math.floor(idx / 12), idx % 12]; };

// Gehalt am 20., Ausgabe am 5. (der Tiefpunkt liegt also MITTEN im Monat, vor
// dem Ratentermin — genau die Stelle, an der die beiden Regeln auseinandergehen),
// Sparrate am Monatsletzten mit einem vorgegebenen Betrag.
function bestand(gespeicherterBetrag, monate = MONATE) {
  const txs = [];
  for (let i = 0; i < monate; i++) {
    const [y, m] = jm(i);
    const b = gespeicherterBetrag;
    txs.push({ id: `spar-${i}`, accountId: "acc-giro", date: letzter(y, m),
      totalAmount: -b, pending: true, _csvType: "expense", desc: SPAR_DESC,
      _seriesId: "s1", splits: [{ id: `sp${i}`, catId: "", subId: "", amount: -b }] });
    txs.push({ id: `tgt-${i}`, accountId: "acc-tg", date: letzter(y, m),
      totalAmount: b, pending: true, _csvType: "income", desc: SPAR_DESC,
      _linkedTo: `spar-${i}`, _seriesId: "s1-tgt",
      splits: [{ id: `tp${i}`, catId: "", subId: "", amount: b }] });
    txs.push({ id: `inc-${i}`, accountId: "acc-giro", date: `${y}-${pad(m + 1)}-20`,
      totalAmount: 3000, pending: true, _csvType: "income", splits: [] });
    txs.push({ id: `aus-${i}`, accountId: "acc-giro", date: `${y}-${pad(m + 1)}-05`,
      totalAmount: -AUSGABEN[i], pending: true, _csvType: "expense", splits: [] });
  }
  return txs;
}
const mkCtx = (txs) => ({ txs, cats: [],
  accounts: [{ id: "acc-giro", name: "Giro" }, { id: "acc-tg", name: "TG" }],
  getKumulierterSaldo: (y, m) => (y === 2026 && m === 6 ? 6000 : null),
  getCat: () => null, getBudgetForMonth: () => 0 });

// So ruft App.jsx die Optimierung auf: auf den ECHTEN Buchungen.
function automatik(txs, monate = MONATE) {
  const opt = sparPlanOptimum({ txs, puffer, ctx: mkCtx(txs), today, abDatumIso: "2026-08-01" });
  return Array.from({ length: monate }, (_, i) => Math.round(opt.get(`spar-${i}`) ?? 0));
}

// So baut das TagesgeldWidget die Vorschau: Raten dieses Plans raus, je Monat
// eine NULL-Rate am Monatsletzten rein, dann dieselbe Funktion.
function vorschau(txs, planMonate = MONATE) {
  const basisTxs = txs.filter((t) => !(t.pending && t.desc === SPAR_DESC));
  const vorschauRaten = Array.from({ length: planMonate }, (_, k) => {
    const [y, m] = jm(k);
    return { id: `vorschau-${k}`, accountId: "acc-giro", date: letzter(y, m),
      totalAmount: 0, pending: true, _csvType: "expense", desc: SPAR_DESC,
      _seriesId: "vorschau-serie",
      splits: [{ id: `vs-${k}`, catId: "", subId: "", amount: 0 }] };
  });
  const planTxs = [...basisTxs, ...vorschauRaten];
  const opt = sparPlanOptimum({ txs: planTxs, puffer, ctx: mkCtx(planTxs), today,
    abDatumIso: "2026-08-01" });
  return Array.from({ length: planMonate }, (_, k) => Math.round(opt.get(`vorschau-${k}`) ?? 0));
}

describe("Sparplan-Anzeige und Giro-Vormerkung sind dieselbe Zahl", () => {
  it("die Vorschau trifft die Automatik Monat für Monat", () => {
    const txs = bestand(583);
    expect(vorschau(txs)).toEqual(automatik(txs));
  });

  it("und zwar egal, welcher Betrag gerade gespeichert ist", () => {
    // Das ist der Kern: Die Vorschau darf sich nicht daran festhalten, was
    // zufaellig schon in den Buchungen steht — sonst zementiert ein alter,
    // falscher Betrag sich selbst.
    const ziel = automatik(bestand(583));
    for (const gespeichert of [0, 103, 583, 5000]) {
      const txs = bestand(gespeichert);
      expect(vorschau(txs), `gespeichert: ${gespeichert}`).toEqual(ziel);
      expect(automatik(txs), `gespeichert: ${gespeichert}`).toEqual(ziel);
    }
  });

  it("der Tiefpunkt MITTEN im Monat begrenzt die Rate nicht mehr", () => {
    // Die alte Regel nahm den Tiefst-Saldo des ganzen Monats als Obergrenze.
    // Der Tiefpunkt liegt hier am 19. (Gehalt kommt erst am 20.), die Rate geht
    // aber erst am Monatsletzten ab — sie kann an diesem Tag nichts aendern.
    // Deshalb darf sie hoeher liegen als der Monats-Tiefstand minus Puffer.
    const werte = automatik(bestand(583));
    expect(werte[0], "August muss deutlich ueber der alten Schranke liegen")
      .toBeGreaterThan(1000);
  });

  it("die Automatik hebt auch wieder AN, nicht nur ab", () => {
    // Eine zu niedrig gespeicherte Rate bleibt nicht zu niedrig.
    const zuNiedrig = bestand(103);
    const neu = automatik(zuNiedrig);
    expect(neu[0]).toBeGreaterThan(103);
  });
});
