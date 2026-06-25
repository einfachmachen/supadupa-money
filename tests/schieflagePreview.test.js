import { describe, it, expect } from "vitest";
import { schieflagePreview } from "../src/utils/schieflagePreview.js";

// computeKontoWarnungen rechnet gegen das ECHTE heutige Datum, daher legen wir
// Szenarien relativ zu „jetzt" an (ein paar Monate in der Zukunft).
const pad = (n) => String(n).padStart(2, "0");
const monthsAhead = (k) => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + k, 1);
};
const isoDay = (base, day) => `${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(day)}`;

// Minimaler, budgetfreier Kontext: Startsaldo 100 € auf dem Giro, kein Budget.
const baseCtx = (txs = []) => ({
  txs,
  cats: [],
  accounts: [{ id: "acc-giro", minPuffer: 0 }],
  getKumulierterSaldo: () => 100,
  getCat: () => null,
  getBudgetForMonth: () => 0,
  budgets: {},
  puffer: 0,
});

const pendingTx = (id, date, amount, type = "expense") => ({
  id, date, totalAmount: amount, _csvType: type, pending: true,
  accountId: "acc-giro", splits: [],
});

describe("schieflagePreview — Live-Vorwarnung vor dem Speichern", () => {
  it("ohne Entwurf → kein Einfluss", () => {
    expect(schieflagePreview({ ...baseCtx([]), draftTxs: [] }).hasImpact).toBe(false);
  });

  it("warnt, wenn eine neue Vormerkung eine Schieflage NEU auslöst", () => {
    const m = monthsAhead(3);
    const draft = [pendingTx("d1", isoDay(m, 15), 500, "expense")]; // 100 − 500 = −400
    const r = schieflagePreview({ ...baseCtx([]), draftTxs: draft });
    expect(r.hasImpact).toBe(true);
    expect(r.isNew).toBe(true);
    expect(r.year).toBe(m.getFullYear());
    expect(r.month).toBe(m.getMonth());
    expect(r.saldoVal).toBe(-400);
    expect(r.deficit).toBe(400); // 0 (Puffer) − (−400)
  });

  it("warnt NICHT, wenn der Entwurf eine Einnahme ist (kein Engpass)", () => {
    const m = monthsAhead(3);
    const draft = [pendingTx("d1", isoDay(m, 15), 500, "income")];
    expect(schieflagePreview({ ...baseCtx([]), draftTxs: draft }).hasImpact).toBe(false);
  });

  it("erkennt das VERSCHLIMMERN einer bereits bestehenden Schieflage", () => {
    const m = monthsAhead(3);
    const existing = [pendingTx("e1", isoDay(m, 10), 200, "expense")]; // 100 − 200 = −100, Defizit 100
    const draft = [pendingTx("d1", isoDay(m, 20), 300, "expense")];     // zusätzlich −300 → −400
    const r = schieflagePreview({ ...baseCtx(existing), draftTxs: draft });
    expect(r.hasImpact).toBe(true);
    expect(r.isNew).toBe(false);
    expect(r.deficit).toBe(400);
    expect(r.deficitDelta).toBe(300);
  });

  it("warnt NICHT, wenn der Entwurf eine bestehende Schieflage NICHT verschärft", () => {
    const m = monthsAhead(3);
    const existing = [pendingTx("e1", isoDay(m, 10), 500, "expense")]; // schon −400
    // Entwurf in einem ANDEREN, unkritischen Monat als kleine Einnahme
    const m2 = monthsAhead(5);
    const draft = [pendingTx("d1", isoDay(m2, 10), 50, "income")];
    expect(schieflagePreview({ ...baseCtx(existing), draftTxs: draft }).hasImpact).toBe(false);
  });

  it("eine Finanzierungs-Serie über mehrere Monate zählt korrekt nach (frühester Monat zuerst)", () => {
    const m1 = monthsAhead(2), m2 = monthsAhead(3), m3 = monthsAhead(4);
    // Drei Raten à 250 €. Startsaldo 100 → schon die erste Rate kippt das Konto.
    const draft = [
      pendingTx("r1", isoDay(m1, 15), 250, "expense"),
      pendingTx("r2", isoDay(m2, 15), 250, "expense"),
      pendingTx("r3", isoDay(m3, 15), 250, "expense"),
    ];
    const r = schieflagePreview({ ...baseCtx([]), draftTxs: draft });
    expect(r.hasImpact).toBe(true);
    expect(r.isNew).toBe(true);
    expect(r.year).toBe(m1.getFullYear());
    expect(r.month).toBe(m1.getMonth()); // frühester betroffener Monat
    expect(r.count).toBeGreaterThanOrEqual(1);
  });
});
