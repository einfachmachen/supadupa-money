// Zählt das noch NICHT ausgegebene Budget gegen die Sparrate?
//
// Nutzer-Verdacht: „Mir kommt es so vor, als würde ‚Sparen-Tagesgeld-Rate
// ermitteln' die noch nicht genutzten Budgets der Budget-Kategorien nicht
// berücksichtigen. Dass die Rate dann einiges höher ist, ist logisch. Ich
// traue dem Braten noch nicht."
//
// Ein berechtigter Verdacht — genau so entstünde eine zu hohe Rate: Das Geld
// für Lebensmittel ist noch da, aber schon verplant. Wird es nicht reserviert,
// wandert es aufs Tagesgeld und fehlt beim Einkaufen.
//
// Reserviert wird es über `restMitte`/`restEnde` (utils/saldo.js), die
// `computeMinTagessaldo` in jeden Tagessaldo einrechnet (`bd` dort). Die Kette
// ist lang — Sparrate → Fenster-Minimum → Tagessaldo → Budget-Reservierung —
// und genau deshalb steht hier eine MESSUNG statt eines Arguments: Wird das
// Budget um X erhöht, muss die Rate um X sinken. Nicht ungefähr, sondern auf
// den Euro.

import { describe, it, expect } from "vitest";
import { sparPlanOptimum, computeMinTagessaldo } from "../src/utils/sparBerechnen.js";

const pad = (n) => String(n).padStart(2, "0");
const today = new Date("2026-08-20");
const MONATE = 4;                          // Aug … Nov 2026
const SPAR_DESC = "Sparen·Tagesgeld";
const letzter = (y, m) => `${y}-${pad(m + 1)}-${pad(new Date(y, m + 1, 0).getDate())}`;
const jm = (i) => { const idx = 7 + i; return [2026 + Math.floor(idx / 12), idx % 12]; };

// Eine Budget-Kategorie, sonst nichts: Gehalt am 1., Sparrate am Monatsletzten.
const CATS = [{ id: "c-haushalt", type: "expense", subs: [{ id: "s-lebensmittel" }] }];

function bestand() {
  const out = [];
  for (let i = 0; i < MONATE; i++) {
    const [y, m] = jm(i);
    out.push({ id: `spar-${i}`, accountId: "acc-giro", date: letzter(y, m),
      totalAmount: 0, pending: true, _csvType: "expense", desc: SPAR_DESC,
      _seriesId: "s1", splits: [{ id: `sp${i}`, catId: "", subId: "", amount: 0 }] });
    out.push({ id: `inc-${i}`, accountId: "acc-giro", date: `${y}-${pad(m + 1)}-01`,
      totalAmount: 3000, pending: true, _csvType: "income", splits: [] });
  }
  return out;
}
const ctxMit = (budget, txs) => ({ txs, cats: CATS,
  accounts: [{ id: "acc-giro", name: "Giro" }],
  getKumulierterSaldo: (y, m) => (y === 2026 && m === 6 ? 2000 : null),
  getCat: () => null,
  getBudgetForMonth: (subId) => (subId === "s-lebensmittel" ? budget : 0) });

function raten(budget) {
  const txs = bestand();
  const opt = sparPlanOptimum({ txs, puffer: 0, ctx: ctxMit(budget, txs), today,
    abDatumIso: "2026-08-01" });
  return Array.from({ length: MONATE }, (_, i) => Math.round(opt.get(`spar-${i}`) ?? 0));
}

describe("Sparrate und ungenutztes Budget", () => {
  const ohne = raten(0);

  it("ohne Budget schöpft der Plan den ganzen Überschuss ab", () => {
    // Anker 2.000 € + 3.000 € Gehalt im August, Puffer 0 → 5.000 € im ersten
    // Monat, danach je 3.000 €. Das ist die Vergleichsbasis.
    expect(ohne).toEqual([5000, 3000, 3000, 3000]);
  });

  it("500 € Budget je Monat senken JEDE Rate um genau 500 €", () => {
    expect(raten(500)).toEqual(ohne.map((r) => r - 500));
  });

  it("900 € Budget je Monat senken jede Rate um genau 900 €", () => {
    // Zwei Werte, damit der Test nicht zufaellig auf einer Konstante sitzt.
    expect(raten(900)).toEqual(ohne.map((r) => r - 900));
  });

  it("die Reservierung steckt schon im Tagessaldo", () => {
    // Eine Stufe tiefer gemessen: dieselbe Wirkung direkt am Saldo, damit
    // klar ist, WO sie herkommt (bd in computeMinTagessaldo).
    const txs = bestand();
    const ohneB = computeMinTagessaldo(2026, 8, {}, "acc-giro", null, ctxMit(0, txs), today);
    const mitB  = computeMinTagessaldo(2026, 8, {}, "acc-giro", null, ctxMit(500, txs), today);
    expect(mitB.saldoAt("2026-09-30")).toBeLessThan(ohneB.saldoAt("2026-09-30"));
    expect(mitB.min).toBeLessThan(ohneB.min);
  });

  it("ein bereits ausgegebenes Budget wird NICHT doppelt abgezogen", () => {
    // Roll-Over-Regel aus utils/saldo.js: reserviert wird nur der REST.
    // Wer die 500 € schon ausgegeben hat, dessen Buchung zieht bereits ab —
    // eine zusaetzliche Reservierung waere ein zweiter Abzug fuer dasselbe Geld.
    const txs = bestand();
    const [y, m] = jm(1);                                     // September
    txs.push({ id: "einkauf", accountId: "acc-giro", date: `${y}-${pad(m + 1)}-10`,
      totalAmount: -500, pending: true, _csvType: "expense",
      splits: [{ id: "e1", catId: "c-haushalt", subId: "s-lebensmittel", amount: -500 }] });
    const opt = sparPlanOptimum({ txs, puffer: 0, ctx: ctxMit(500, txs), today,
      abDatumIso: "2026-08-01" });
    const mit = Array.from({ length: MONATE }, (_, i) => Math.round(opt.get(`spar-${i}`) ?? 0));
    // Das Fenster der August-Rate reicht bis in den September, sie traegt den
    // Einkauf also mit. Entscheidend ist die HOEHE: 500 €, nicht 1.000 €.
    // Waeren Reservierung und Buchung beide abgezogen worden, stuende hier
    // ohne[0] − 1000 — dieselben 500 € zweimal.
    expect(mit[0], "einmal 500, nicht zweimal").toBe(ohne[0] - 500);
    expect(mit[1], "September selbst: 3000 − 500 Budget").toBe(ohne[1] - 500);
  });
});
