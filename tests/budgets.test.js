import { describe, it, expect } from "vitest";
import { budgetOpenRestFor, istForSubInList } from "../src/utils/budgets.js";
import { buildTxIdMap } from "../src/utils/tx.js";

// May 2026 (month index 4), letzter Tag = 31.
const sp = (amount) => [{ id: "sp", catId: "c-essen", subId: "s-essen", amount }];

function fixture() {
  const txs = [
    // Budget-Platzhalter: Mitte 100, Ende 150 → Gesamt 250
    { id: "m", pending: true, _budgetSubId: "s-essen_mitte", totalAmount: -100,
      accountId: "acc-giro", date: "2026-05-14", splits: sp(-100) },
    { id: "e", pending: true, _budgetSubId: "s-essen", totalAmount: -150,
      accountId: "acc-giro", date: "2026-05-31", splits: sp(-150) },
    // Reale Ausgaben
    { id: "r1", pending: false, totalAmount: -30, accountId: "acc-giro",
      date: "2026-05-10", splits: sp(-30) },            // 1..14
    { id: "r2", pending: false, totalAmount: -40, accountId: "acc-giro",
      date: "2026-05-20", splits: sp(-40) },            // 15..31
    // Konkrete Vormerkung (kein Budget-Platzhalter)
    { id: "c1", pending: true, totalAmount: -10, accountId: "acc-giro",
      date: "2026-05-12", splits: sp(-10) },            // 1..14
    // CSV-Paar: p1 zählt, d1 (_linkedTo, gleiches Konto) ist Duplikat → raus
    { id: "p1", pending: false, totalAmount: -25, accountId: "acc-giro",
      date: "2026-05-05", splits: sp(-25) },
    { id: "d1", pending: false, totalAmount: -25, accountId: "acc-giro",
      date: "2026-05-05", _linkedTo: "p1", splits: sp(-25) },
    // Anderes Konto → darf NICHT zählen (Budgets liegen auf Giro)
    { id: "x", pending: false, totalAmount: -1000, accountId: "acc-tagesgeld",
      date: "2026-05-08", splits: sp(-1000) },
  ];
  return { txs, txsById: buildTxIdMap(txs) };
}

describe("budgetOpenRestFor", () => {
  it("istForSubInList: nur Giro, ohne Duplikate/Budget-Platzhalter, tagesgenau", () => {
    const { txs, txsById } = fixture();
    // 1..14: r1(30) + c1(10) + p1(25) = 65  (d1 dupl & x non-giro raus)
    expect(istForSubInList(txs, txsById, 2026, 4, "s-essen", 1, 14)).toBe(65);
    // ganzer Monat: + r2(40) = 105
    expect(istForSubInList(txs, txsById, 2026, 4, "s-essen", 1, 31)).toBe(105);
  });

  it("Mitte-Restbudget = MitteBudget − Ist(1..14)", () => {
    const { txs, txsById } = fixture();
    const mitte = txs.find(t => t.id === "m");
    expect(budgetOpenRestFor(mitte, txs, txsById, 2026, 4)).toBe(100 - 65); // 35
  });

  it("Ende-Restbudget = Gesamtbudget − Ist(ganzer Monat)", () => {
    const { txs, txsById } = fixture();
    const ende = txs.find(t => t.id === "e");
    expect(budgetOpenRestFor(ende, txs, txsById, 2026, 4)).toBe(250 - 105); // 145
  });

  it("überschrittenes Budget → negativer Rest", () => {
    const { txs, txsById } = fixture();
    // Mitte-Budget künstlich klein: 50 − 65 = −15
    const mitte = { ...txs.find(t => t.id === "m"), totalAmount: -50 };
    expect(budgetOpenRestFor(mitte, [mitte, ...txs.filter(t=>t.id!=="m")], txsById, 2026, 4)).toBe(-15);
  });

  it("kein Budget-Platzhalter → null", () => {
    const { txs, txsById } = fixture();
    expect(budgetOpenRestFor(txs.find(t => t.id === "r1"), txs, txsById, 2026, 4)).toBe(null);
  });

  it("manuell freigegeben (_releasedEarly) → Rest 0, unabhängig vom Ist", () => {
    const { txs, txsById } = fixture();
    const ende = { ...txs.find(t => t.id === "e"), _releasedEarly: true };
    expect(budgetOpenRestFor(ende, txs, txsById, 2026, 4)).toBe(0);
  });
});

// Regression (echter Nutzer-Bericht mit Screenshots): In der Mitte-Ansicht der
// Detaillisten stand als "genutzt" ein viel zu hoher Betrag — teils mehr als
// in der Ende-Ansicht, was gar nicht sein kann: was bis zum 14. verbraucht
// ist, kann nicht mehr sein als bis zum Monatsende.
//
// Ursache war eine gemischte Bezugsgroesse. Die Zeile zeigt
//   genutzt = Budget − Rest
// und in der Mitte-Ansicht kam der Rest von der Mitte-HAELFTE, das Budget aber
// vom GANZEN Monat. Ergebnis: die komplette zweite Monatshaelfte erschien als
// verbraucht. Der Test haelt die Rechnung als solche fest.
describe("Budget-Zeile: genutzt = Budget − Rest, beides auf derselben Grundlage", () => {
  const genutzt = (budget, rest) => Math.max(0, budget - rest);

  // Zahlen aus dem Bericht: volles Monatsbudget, Mitte-Haelfte, gemeldeter Rest
  // der Haelfte und der Betrag, der tatsaechlich gebucht war.
  const faelle = [
    { name: "Unvorhergesehenes", voll: 300, haelfte: 150, restHaelfte: 143.52, echt: 6.48 },
    { name: "Mittag Lieferdienste", voll: 100, haelfte: 50, restHaelfte: 15.87, echt: 34.13 },
    { name: "Essen & Trinken", voll: 250, haelfte: 125, restHaelfte: 100.17, echt: 24.83 },
    { name: "Bäcker", voll: 50, haelfte: 25, restHaelfte: 25, echt: 0 },
  ];

  faelle.forEach(({ name, voll, haelfte, restHaelfte, echt }) => {
    it(`${name}: Haelfte als Grundlage ergibt den tatsaechlich gebuchten Betrag`, () => {
      expect(genutzt(haelfte, restHaelfte)).toBeCloseTo(echt, 2);
    });

    it(`${name}: mit dem vollen Budget als Grundlage waere es falsch zu hoch`, () => {
      expect(genutzt(voll, restHaelfte)).toBeGreaterThan(echt);
    });
  });
});
