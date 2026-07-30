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

  // Umbuchung als Entwurf: das Abgang-Bein (Quelle) zählt fürs Giro, das
  // verknüpfte Zugang-Bein (_linkedTo) wird neutralisiert.
  const transferDraft = (i, date, amount, srcId, tgtId) => [
    { id:`draft-out-${i}`, date, totalAmount:-amount, _csvType:"expense", pending:true, accountId:srcId, splits:[] },
    { id:`draft-in-${i}`,  date, totalAmount: amount, _csvType:"income",  pending:true, accountId:tgtId, _linkedTo:`draft-out-${i}`, splits:[] },
  ];
  const transferCtx = (txs = []) => ({
    ...baseCtx(txs),
    accounts: [{ id:"acc-giro", minPuffer:0 }, { id:"acc-tg", minPuffer:0 }],
  });

  it("warnt, wenn eine Umbuchung RAUS aus dem Giro es unter den Puffer drückt", () => {
    const m = monthsAhead(3);
    const draft = transferDraft(0, isoDay(m, 15), 500, "acc-giro", "acc-tg"); // Giro 100 − 500 = −400
    const r = schieflagePreview({ ...transferCtx([]), draftTxs: draft });
    expect(r.hasImpact).toBe(true);
    expect(r.isNew).toBe(true);
    expect(r.saldoVal).toBe(-400);
    expect(r.deficit).toBe(400);
  });

  it("warnt NICHT bei einer Umbuchung INS Giro (Zugang hebt den Saldo)", () => {
    const m = monthsAhead(3);
    const draft = transferDraft(0, isoDay(m, 15), 500, "acc-tg", "acc-giro");
    expect(schieflagePreview({ ...transferCtx([]), draftTxs: draft }).hasImpact).toBe(false);
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

// Regression (Nutzer-Feedback): würde die automatische Sparraten-Anpassung
// (computeSafeCurrentMonthAmount) die durch den Entwurf ausgelöste Schieflage
// vollständig vermeiden, soll ein Zusatz-Hinweis erscheinen ("Durch
// Reduzierung ... von X € auf Y € wird die Schieflage vermieden"). Ist die
// Schieflage NICHT (vollständig) durch eine Reduzierung vermeidbar, bleibt es
// bei der normalen Warnung ohne diesen Zusatz.
describe("schieflagePreview — sparAdjust (automatische Sparraten-Anpassung)", () => {
  const nowM = monthsAhead(0);
  const sparAbgang = (amount) => ({
    id: "spar-abgang", accountId: "acc-giro", date: isoDay(nowM, 28), totalAmount: -amount,
    pending: true, _csvType: "expense", desc: "Sparen·Tagesgeld", _seriesId: "s1",
    splits: [{ id: "sp1", catId: "", subId: "", amount: -amount }],
  });
  const ctxWithAnchor = (existing) => ({
    txs: existing, cats: [], accounts: [{ id: "acc-giro", minPuffer: 100 }],
    getKumulierterSaldo: () => 1000, getCat: () => null, getBudgetForMonth: () => 0,
    budgets: {}, puffer: 100,
  });

  it("schlägt eine Sparraten-Reduzierung vor, die die Schieflage vollständig vermeidet", () => {
    const m = monthsAhead(3);
    // Bestehend: nur die laufende Sparplan-Buchung (269 €) — für sich genommen
    // kein Engpass. Entwurf: eine 700 €-Ausgabe 3 Monate später löst den
    // Engpass aus (1000 − 269 − 700 = 31 → 69 € unter Puffer 100 €).
    const draft = [pendingTx("d1", isoDay(m, 15), 700, "expense")];
    const r = schieflagePreview({ ...ctxWithAnchor([sparAbgang(269)]), draftTxs: draft });
    expect(r.hasImpact).toBe(true);
    expect(r.isNew).toBe(true);
    expect(r.sparAdjust).not.toBeNull();
    expect(r.sparAdjust.oldAmount).toBe(269);
    expect(r.sparAdjust.safeAmount).toBe(200); // 269 − 69 = 200
    expect(r.sparAdjust.year).toBe(nowM.getFullYear());
    expect(r.sparAdjust.month).toBe(nowM.getMonth());
  });

  it("schlägt NICHTS vor, wenn selbst eine Reduzierung auf 0 die Schieflage nicht vollständig vermeidet", () => {
    const m = monthsAhead(3);
    // Entwurf so groß, dass selbst eine Sparrate von 0 € nicht ausreicht
    // (1000 − 0 − 5000 liegt weit unter dem Puffer).
    const draft = [pendingTx("d1", isoDay(m, 15), 5000, "expense")];
    const r = schieflagePreview({ ...ctxWithAnchor([sparAbgang(269)]), draftTxs: draft });
    expect(r.hasImpact).toBe(true);
    expect(r.sparAdjust).toBeNull();
  });

  it("schlägt NICHTS vor, wenn keine eindeutige Sparplan-Buchung im laufenden Monat existiert", () => {
    const m = monthsAhead(3);
    // Ohne Sparplan-Buchung muss der Entwurf allein schon unter den Puffer
    // drücken (1000 − 950 = 50 → 50 € unter Puffer 100 €).
    const draft = [pendingTx("d1", isoDay(m, 15), 950, "expense")];
    const r = schieflagePreview({ ...ctxWithAnchor([]), draftTxs: draft }); // keine Sparplan-Buchung
    expect(r.hasImpact).toBe(true);
    expect(r.sparAdjust).toBeNull();
  });
});
