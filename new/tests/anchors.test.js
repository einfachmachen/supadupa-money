import { describe, it, expect } from "vitest";
import { anchorFromDetectedBalance } from "../src/utils/anchors.js";

// Mini-Replik der getKumulierterSaldo-Aufaddierung (konto-spezifisch),
// um den Round-Trip Anker→Kontostand zu prüfen. Identische Filter-Logik
// wie App.jsx:getKumulierterSaldo (pending & _linkedTo raus).
function kumSaldo(anchorYear, anchorMonth, anchorValue, txs, accId, toYear, toMonth) {
  const signed = t => {
    const type = t._csvType || ((t.totalAmount || 0) >= 0 ? "income" : "expense");
    return type === "income" ? Math.abs(t.totalAmount || 0) : -Math.abs(t.totalAmount || 0);
  };
  let saldo = anchorValue;
  let startY = anchorYear, startM = anchorMonth + 1;
  if (startM > 11) { startM = 0; startY++; }
  for (let y = startY; y <= toYear; y++) {
    const maxM = y === toYear ? toMonth : 11, minM = y === startY ? startM : 0;
    for (let m = minM; m <= maxM; m++) {
      txs.forEach(t => {
        if (t.pending || t._linkedTo) return;
        if ((t.accountId || "acc-giro") !== accId) return;
        const d = new Date(t.date);
        if (d.getFullYear() === y && d.getMonth() === m) saldo += signed(t);
      });
    }
  }
  return saldo;
}

describe("anchorFromDetectedBalance", () => {
  it("Monats-Ende-Datum bleibt unveraendert (Quartalsabrechnung)", () => {
    const a = anchorFromDetectedBalance({ saldo: 10109.22, date: "2026-03-31" }, [], "acc-tagesgeld");
    expect(a).toEqual({ year: 2026, month: 2, value: 10109.22 });
  });

  it("30.06. (letzter Tag Juni) bleibt Monats-Ende", () => {
    const a = anchorFromDetectedBalance({ saldo: 5276.59, date: "2025-06-30" }, [], "acc-tagesgeld");
    expect(a).toEqual({ year: 2025, month: 5, value: 5276.59 });
  });

  it("Datum mitten im Monat → Vormonats-Ende mit Abzug der bisherigen Buchungen", () => {
    // Saldo am 20.05. = 8905. Im Mai bis dahin: -100 (eine Buchung am 10.05.)
    const txs = [
      { id: "t1", date: "2026-05-10", totalAmount: -100, accountId: "acc-tagesgeld" },
    ];
    const a = anchorFromDetectedBalance({ saldo: 8905, date: "2026-05-20" }, txs, "acc-tagesgeld");
    // Vormonats-Ende (Apr) = 8905 - (-100) = 9005
    expect(a).toEqual({ year: 2026, month: 3, value: 9005 });
  });

  it("Buchungen NACH dem Anker-Tag werden nicht abgezogen", () => {
    const txs = [
      { id: "t1", date: "2026-05-10", totalAmount: -100, accountId: "acc-tagesgeld" },
      { id: "t2", date: "2026-05-25", totalAmount: -2500, accountId: "acc-tagesgeld" }, // nach dem 20.
    ];
    const a = anchorFromDetectedBalance({ saldo: 8905, date: "2026-05-20" }, txs, "acc-tagesgeld");
    expect(a.value).toBe(9005); // nur -100 abgezogen
  });

  it("pending & _linkedTo werden beim Abzug ignoriert", () => {
    const txs = [
      { id: "t1", date: "2026-05-10", totalAmount: -100, accountId: "acc-tagesgeld" },
      { id: "p1", date: "2026-05-11", totalAmount: -50, accountId: "acc-tagesgeld", pending: true },
      { id: "l1", date: "2026-05-12", totalAmount: -50, accountId: "acc-tagesgeld", _linkedTo: "t1" },
    ];
    const a = anchorFromDetectedBalance({ saldo: 8905, date: "2026-05-20" }, txs, "acc-tagesgeld");
    expect(a.value).toBe(9005);
  });

  it("nur Buchungen des Zielkontos werden abgezogen", () => {
    const txs = [
      { id: "t1", date: "2026-05-10", totalAmount: -100, accountId: "acc-tagesgeld" },
      { id: "g1", date: "2026-05-10", totalAmount: -999, accountId: "acc-giro" },
    ];
    const a = anchorFromDetectedBalance({ saldo: 8905, date: "2026-05-20" }, txs, "acc-tagesgeld");
    expect(a.value).toBe(9005);
  });

  it("Januar mitten im Monat → Vormonats-Ende ist Dezember Vorjahr", () => {
    const a = anchorFromDetectedBalance({ saldo: 1000, date: "2026-01-15" }, [], "acc-tagesgeld");
    expect(a).toEqual({ year: 2025, month: 11, value: 1000 });
  });

  it("ungueltiger Input → null", () => {
    expect(anchorFromDetectedBalance(null, [], "x")).toBe(null);
    expect(anchorFromDetectedBalance({ saldo: 1 }, [], "x")).toBe(null);
    expect(anchorFromDetectedBalance({ date: "2026-05-01" }, [], "x")).toBe(null);
  });

  it("ROUND-TRIP: Userszenario — Anker am 20.05., AIDAcosma -2500 am 25.05.", () => {
    // Statement: Kontostand am 20.05.2026 = 8905; danach echte Abbuchung -2500.
    const txs = [
      { id: "aida", date: "2026-05-25", totalAmount: -2500, pending: false, accountId: "acc-tagesgeld", _csvType: "expense" },
    ];
    const a = anchorFromDetectedBalance({ saldo: 8905, date: "2026-05-20" }, txs, "acc-tagesgeld");
    // Anker landet im April (Vormonats-Ende) = 8905 (keine Mai-Buchung <= 20.)
    expect(a).toEqual({ year: 2026, month: 3, value: 8905 });
    // getKumulierterSaldo für Mai rechnet alle Mai-Buchungen drauf → 6405
    const ks = kumSaldo(a.year, a.month, a.value, txs, "acc-tagesgeld", 2026, 4);
    expect(ks).toBe(6405);
  });

  it("ROUND-TRIP: echtes Monats-Ende verschluckt eigenen Monat NICHT faelschlich", () => {
    // Quartals-Anker 31.03. = 10109.22, danach April/Mai-Buchungen
    const txs = [
      { id: "apr", date: "2026-04-10", totalAmount: -1204.22, accountId: "acc-tagesgeld", _csvType: "expense" },
      { id: "mai", date: "2026-05-25", totalAmount: -2500, accountId: "acc-tagesgeld", _csvType: "expense" },
    ];
    const a = anchorFromDetectedBalance({ saldo: 10109.22, date: "2026-03-31" }, txs, "acc-tagesgeld");
    expect(a).toEqual({ year: 2026, month: 2, value: 10109.22 });
    const ks = kumSaldo(a.year, a.month, a.value, txs, "acc-tagesgeld", 2026, 4);
    expect(ks).toBeCloseTo(6405, 2);
  });
});
