import { describe, it, expect } from "vitest";
import {
  anchorFromDetectedBalance, makeAnchorEntry,
  anchorValue, anchorDay, effectiveAnchorDay, lastDayOfMonth, isLastDayOfMonth,
} from "../src/utils/anchors.js";

// Replik der getKumulierterSaldo-Aufaddierung (konto-spezifisch) MIT Tag-Floor,
// um den Round-Trip Anker→Kontostand zu prüfen. Identische Logik wie App.jsx.
function kumSaldo(anchor, txs, accId, toYear, toMonth) {
  const value = anchorValue(anchor.entry);
  const day = anchorDay(anchor.entry);
  const aDay = day == null ? lastDayOfMonth(anchor.year, anchor.month) : day;
  const signed = t => {
    const type = t._csvType || ((t.totalAmount || 0) >= 0 ? "income" : "expense");
    return type === "income" ? Math.abs(t.totalAmount || 0) : -Math.abs(t.totalAmount || 0);
  };
  let saldo = value;
  const startY = anchor.year, startM = anchor.month;
  for (let y = startY; y <= toYear; y++) {
    const maxM = y === toYear ? toMonth : 11, minM = y === startY ? startM : 0;
    for (let m = minM; m <= maxM; m++) {
      const isAnchorMonth = y === anchor.year && m === anchor.month;
      txs.forEach(t => {
        if (t.pending || t._linkedTo) return;
        if ((t.accountId || "acc-giro") !== accId) return;
        const d = new Date(t.date);
        if (d.getFullYear() !== y || d.getMonth() !== m) return;
        if (isAnchorMonth && d.getDate() <= aDay) return;
        saldo += signed(t);
      });
    }
  }
  return saldo;
}

describe("anchors helpers", () => {
  it("anchorValue/anchorDay lesen beide Formate", () => {
    expect(anchorValue(8905)).toBe(8905);
    expect(anchorDay(8905)).toBe(null);
    expect(anchorValue({ v: 8905, day: 20 })).toBe(8905);
    expect(anchorDay({ v: 8905, day: 20 })).toBe(20);
    expect(anchorValue(undefined)).toBe(null);
    expect(anchorValue({})).toBe(null);
  });

  it("lastDayOfMonth / isLastDayOfMonth", () => {
    expect(lastDayOfMonth(2026, 4)).toBe(31);  // Mai
    expect(lastDayOfMonth(2026, 1)).toBe(28);  // Feb 2026
    expect(isLastDayOfMonth(2026, 4, 31)).toBe(true);
    expect(isLastDayOfMonth(2026, 4, 20)).toBe(false);
  });

  it("effectiveAnchorDay: Monats-Ende-Anker → letzter Tag", () => {
    expect(effectiveAnchorDay(8905, 2026, 4)).toBe(31);
    expect(effectiveAnchorDay({ v: 8905, day: 20 }, 2026, 4)).toBe(20);
  });

  it("makeAnchorEntry: Monats-Ende → schlichte Zahl, sonst {v,day}", () => {
    expect(makeAnchorEntry(10109.22, 2026, 2, 31)).toBe(10109.22); // 31.03.
    expect(makeAnchorEntry(8905, 2026, 4, 20)).toEqual({ v: 8905, day: 20 }); // 20.05.
    expect(makeAnchorEntry(5276.59, 2025, 5, 30)).toBe(5276.59); // 30.06.
  });
});

describe("anchorFromDetectedBalance", () => {
  it("liefert taggenaue Felder", () => {
    expect(anchorFromDetectedBalance({ saldo: 8905, date: "2026-05-20" }))
      .toEqual({ year: 2026, month: 4, day: 20, value: 8905 });
    expect(anchorFromDetectedBalance({ saldo: 10109.22, date: "2026-03-31" }))
      .toEqual({ year: 2026, month: 2, day: 31, value: 10109.22 });
  });

  it("ungueltiger Input → null", () => {
    expect(anchorFromDetectedBalance(null)).toBe(null);
    expect(anchorFromDetectedBalance({ saldo: 1 })).toBe(null);
    expect(anchorFromDetectedBalance({ date: "2026-05-01" })).toBe(null);
  });
});

describe("Round-Trip Anker → getKumulierterSaldo", () => {
  it("USERSZENARIO: taggenauer Anker 20.05.=8905, AIDAcosma -2500 am 25.05. → 6405", () => {
    const det = anchorFromDetectedBalance({ saldo: 8905, date: "2026-05-20" });
    const entry = makeAnchorEntry(det.value, det.year, det.month, det.day);
    expect(entry).toEqual({ v: 8905, day: 20 });
    const txs = [
      { id: "aida", date: "2026-05-25", totalAmount: -2500, accountId: "acc-tagesgeld", _csvType: "expense" },
    ];
    const ks = kumSaldo({ year: det.year, month: det.month, entry }, txs, "acc-tagesgeld", 2026, 4);
    expect(ks).toBe(6405);
  });

  it("Buchung VOR dem Anker-Tag wird NICHT doppelt gezaehlt", () => {
    // Anker am 20.05.=8905 enthaelt bereits die -100 vom 10.05.
    const entry = { v: 8905, day: 20 };
    const txs = [
      { id: "vor", date: "2026-05-10", totalAmount: -100, accountId: "acc-tagesgeld", _csvType: "expense" },
      { id: "nach", date: "2026-05-25", totalAmount: -2500, accountId: "acc-tagesgeld", _csvType: "expense" },
    ];
    const ks = kumSaldo({ year: 2026, month: 4, entry }, txs, "acc-tagesgeld", 2026, 4);
    expect(ks).toBe(6405); // 8905 - 2500, die -100 steckt schon im Anker
  });

  it("Monats-Ende-Anker (Quartal) verschluckt eigenen Monat korrekt", () => {
    // 31.03.=10109.22 als schlichte Zahl, danach April/Mai-Buchungen
    const entry = makeAnchorEntry(10109.22, 2026, 2, 31); // = 10109.22 (Zahl)
    expect(typeof entry).toBe("number");
    const txs = [
      { id: "apr", date: "2026-04-10", totalAmount: -1204.22, accountId: "acc-tagesgeld", _csvType: "expense" },
      { id: "mai", date: "2026-05-25", totalAmount: -2500, accountId: "acc-tagesgeld", _csvType: "expense" },
    ];
    const ks = kumSaldo({ year: 2026, month: 2, entry }, txs, "acc-tagesgeld", 2026, 4);
    expect(ks).toBeCloseTo(6405, 2);
  });

  it("Folgemonats-Buchungen werden voll gezaehlt (Tag-Floor nur im Anker-Monat)", () => {
    const entry = { v: 1000, day: 15 };
    const txs = [
      { id: "a", date: "2026-05-10", totalAmount: -50, accountId: "acc-tagesgeld", _csvType: "expense" }, // <=15, schon drin
      { id: "b", date: "2026-06-01", totalAmount: -200, accountId: "acc-tagesgeld", _csvType: "expense" }, // Folgemonat
    ];
    const ks = kumSaldo({ year: 2026, month: 4, entry }, txs, "acc-tagesgeld", 2026, 5);
    expect(ks).toBe(800); // 1000 - 200
  });
});
