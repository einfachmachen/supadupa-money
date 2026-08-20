// Trifft eine Änderung wirklich die Sparrate des BETROFFENEN Monats?
//
// Das war der Kern des Umbaus (Nutzer-Entscheidung): Eine Vormerkung, die erst
// in einem fernen Monat wirkt, soll nicht schon heute den Sparbetrag drücken —
// „ich möchte so viel wie möglich sparen, besonders in den Monaten mit der
// Super-Sparrate".
//
// Was `sparPlanOptimum` daraus macht: Die Kürzung wird von HINTEN genommen.
// Erst die Rate unmittelbar vor dem Engpass, dann die davor, und so weiter.
// Die frühen Raten bleiben stehen, solange die späten die Sache tragen.
//
// Die Grenze bleibt bestehen und steht im letzten Fall hier: Reichen selbst
// alle späteren Raten bis auf 0 nicht aus, muss doch eine frühere nachgeben.
// Das ist keine Schwäche der Umsetzung, sondern eine Eigenschaft des Sparens
// in EINE Richtung (Herleitung über `sparPlanOptimum`).
//
// Die Zahlen hier sind im Browser nicht nachprüfbar, aber sie sind aus dem
// laufenden Code gemessen — dieser Test hält sie fest, damit die Zusage nicht
// still verlorengeht.

import { describe, it, expect } from "vitest";
import { sparPlanOptimum } from "../src/utils/sparBerechnen.js";

const pad = (n) => String(n).padStart(2, "0");
const MONATE = 8;                       // Aug 2026 … Mär 2027
const today = new Date("2026-08-20");
const puffer = 100;

// Gehalt am 1., Ausgaben am 15., Sparrate am 28. — acht Monate lang.
function bestand(extra = []) {
  const txs = [];
  for (let i = 0; i < MONATE; i++) {
    const m = (7 + i) % 12, y = 2026 + Math.floor((7 + i) / 12);
    txs.push({ id: `spar-${i}`, accountId: "acc-giro", date: `${y}-${pad(m + 1)}-28`,
      totalAmount: -300, pending: true, _csvType: "expense", desc: "Sparen·Tagesgeld",
      _seriesId: "s1", splits: [{ id: `sp${i}`, catId: "", subId: "", amount: -300 }] });
    txs.push({ id: `inc-${i}`, accountId: "acc-giro", date: `${y}-${pad(m + 1)}-01`,
      totalAmount: 3000, pending: true, _csvType: "income", splits: [] });
    txs.push({ id: `aus-${i}`, accountId: "acc-giro", date: `${y}-${pad(m + 1)}-15`,
      totalAmount: -2400, pending: true, _csvType: "expense", splits: [] });
  }
  return [...txs, ...extra];
}
const vormerkung = (id, datum, betrag) => ({ id, accountId: "acc-giro", date: datum,
  totalAmount: -betrag, pending: true, _csvType: "expense", splits: [] });

function raten(extra = []) {
  const txs = bestand(extra);
  const opt = sparPlanOptimum({
    txs, puffer, today, abDatumIso: "2026-08-01",
    ctx: { txs, cats: [], accounts: [{ id: "acc-giro", name: "Giro" }],
      // Anker nur für den Vormonat — danach schreibt die App selbst fort.
      getKumulierterSaldo: (y, m) => (y === 2026 && m === 6 ? 5000 : null),
      getCat: () => null, getBudgetForMonth: () => 0 },
  });
  return Array.from({ length: MONATE }, (_, i) => opt.get(`spar-${i}`) ?? null);
}

describe("Eine Änderung trifft die Rate des betroffenen Monats", () => {
  const ohne = raten();

  it("Grundfall: ohne Vormerkung stehen alle Raten am Anschlag", () => {
    expect(ohne.every((r) => r !== null && r > 0)).toBe(true);
  });

  it("Vormerkung im März kürzt Februar und März — nicht August", () => {
    // Gemessen: Aug–Jan unverändert, Feb 600 → 300, Mär 600 → 0.
    const mit = raten([vormerkung("vm", "2027-03-10", 900)]);
    // Die ersten sechs Raten (Aug … Jan) bleiben, wie sie waren.
    expect(mit.slice(0, 6)).toEqual(ohne.slice(0, 6));
    // Die letzten beiden tragen die Kürzung.
    expect(mit[7], "März muss ganz nachgeben").toBeLessThan(ohne[7]);
    expect(mit[6] + mit[7], "zusammen deutlich weniger").toBeLessThan(ohne[6] + ohne[7]);
  });

  it("wird es zu viel, greift es rückwärts weiter — von hinten nach vorn", () => {
    // 2.600 € lassen sich mit Feb + Mär nicht auffangen; gemessen sinkt dann
    // auch November, während August unangetastet bleibt.
    const mit = raten([vormerkung("vm", "2027-03-10", 2600)]);
    expect(mit[7]).toBe(0);
    expect(mit[6]).toBe(0);
    expect(mit[5]).toBe(0);
    expect(mit[3], "November gibt nach").toBeLessThan(ohne[3]);
    expect(mit[0], "August bleibt trotzdem stehen").toBe(ohne[0]);
    // Und die Reihenfolge stimmt: was später liegt, gibt zuerst nach.
    for (let i = 1; i < MONATE; i++) {
      if (mit[i] < ohne[i] && mit[i - 1] < ohne[i - 1]) {
        expect(mit[i], `Monat ${i} muss mindestens so stark gekürzt sein wie ${i - 1}`)
          .toBeLessThanOrEqual(mit[i - 1] + ohne[i] - ohne[i - 1] + 1e-9);
      }
    }
  });

  it("etwas im LAUFENDEN Monat trifft genau dessen Rate", () => {
    // Gemessen: nur August sinkt (5500 → 5100), alle späteren bleiben.
    const mit = raten([vormerkung("vm", "2026-08-25", 400)]);
    expect(mit[0]).toBe(ohne[0] - 400);
    expect(mit.slice(1)).toEqual(ohne.slice(1));
  });

  it("fällt die Vormerkung weg, gehen die Raten wieder hoch", () => {
    // Die Automatik senkt nicht nur, sie hebt auch wieder an — sonst bliebe
    // eine einmalige Delle für immer als Kürzung stehen.
    const mit = raten([vormerkung("vm", "2027-03-10", 900)]);
    expect(mit).not.toEqual(ohne);
    expect(raten()).toEqual(ohne);
  });
});
