import { describe, it, expect } from "vitest";
import { pendingForecast } from "../src/utils/moodForecast.js";

// Hilfsfunktion: materialisiert eine wiederkehrende VM-Serie als einzelne
// pending-Tx je Monat — genau wie MobileWiederkehrendModal es speichert.
function series({ seriesId, fromY, fromM, count, amount, csvType, catId, subId, accountId = "acc-giro" }) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const total = fromM + i;
    const y = fromY + Math.floor(total / 12);
    const m = total % 12;
    out.push({
      id: `${seriesId}-${i}`, date: `${y}-${String(m + 1).padStart(2, "0")}-15`,
      desc: "Gehalt", totalAmount: amount, pending: true, _csvType: csvType,
      accountId, splits: catId ? [{ id: `s${i}`, catId, subId: subId || "", amount }] : [],
      _seriesId: seriesId, _seriesIdx: i + 1, _seriesTotal: count,
    });
  }
  return out;
}

describe("pendingForecast — wiederkehrende Vormerkungen", () => {
  it("zählt eine künftige Einnahmen-Serie (bis weit in die Zukunft) im jeweils betrachteten Jahr mit", () => {
    // Gehalt 3000 €/Monat, Serie ab 06.2026 über 80 Monate (~bis 2033).
    const txs = series({
      seriesId: "gehalt", fromY: 2026, fromM: 5, count: 80, amount: 3000,
      csvType: "income", catId: "cat-einkommen", subId: "sub-gehalt",
    });
    const catTypeById = { "cat-einkommen": "income" };

    // Betrachtetes Jahr 2026: Juni–Dezember (Index 5–11) tragen je 3000 €.
    const f2026 = pendingForecast(txs, { year: 2026, catTypeById });
    expect(f2026.incTot[4]).toBe(0);       // Mai: noch nichts
    expect(f2026.incTot[5]).toBe(3000);    // Juni
    expect(f2026.incTot[11]).toBe(3000);   // Dezember
    expect(f2026.incTot.reduce((a, b) => a + b, 0)).toBe(7 * 3000);
    expect(f2026.sub["5:sub-gehalt"]).toBe(3000);
    expect(f2026.expTot.every(v => v === 0)).toBe(true);

    // Auch ein künftiges Jahr (2030) wird über dieselben materialisierten Tx erfasst.
    const f2030 = pendingForecast(txs, { year: 2030, catTypeById });
    expect(f2030.incTot.every((v, i) => v === 3000)).toBe(true); // alle 12 Monate
  });

  it("klassifiziert Einnahmen auch ohne Kategorie über _csvType bzw. Vorzeichen", () => {
    const txs = [
      { id: "a", date: "2026-03-10", totalAmount: 500, pending: true, _csvType: "income", splits: [] },
      { id: "b", date: "2026-03-20", totalAmount: 200, pending: true, splits: [] }, // kein _csvType → positives Vorzeichen ⇒ Einnahme
    ];
    const f = pendingForecast(txs, { year: 2026 });
    expect(f.incTot[2]).toBe(700);
    expect(f.expTot[2]).toBe(0);
  });

  it("ignoriert Budget-Platzhalter, Counterparts und gebuchte Tx", () => {
    const txs = [
      { id: "bud", date: "2026-04-01", totalAmount: 400, pending: true, _budgetSubId: "sub-x", _csvType: "expense", splits: [{ catId: "c", subId: "sub-x", amount: -400 }] },
      { id: "cp", date: "2026-04-02", totalAmount: 100, pending: true, _linkedTo: "z", _csvType: "income", splits: [] },
      { id: "booked", date: "2026-04-03", totalAmount: 250, pending: false, _csvType: "expense", splits: [] },
    ];
    const f = pendingForecast(txs, { year: 2026 });
    expect(f.expTot.every(v => v === 0)).toBe(true);
    expect(f.incTot.every(v => v === 0)).toBe(true);
    expect(f.sub["3:sub-x"]).toBeUndefined();
  });

  it("respektiert den Konto-Filter", () => {
    const txs = [
      { id: "g", date: "2026-02-10", totalAmount: 3000, pending: true, _csvType: "income", accountId: "acc-giro", splits: [] },
      { id: "t", date: "2026-02-11", totalAmount: 1000, pending: true, _csvType: "income", accountId: "acc-tagesgeld", splits: [] },
    ];
    expect(pendingForecast(txs, { year: 2026 }).incTot[1]).toBe(4000);             // GESAMT
    expect(pendingForecast(txs, { year: 2026, selAcc: "acc-giro" }).incTot[1]).toBe(3000);
    expect(pendingForecast(txs, { year: 2026, selAcc: "acc-tagesgeld" }).incTot[1]).toBe(1000);
  });
});
