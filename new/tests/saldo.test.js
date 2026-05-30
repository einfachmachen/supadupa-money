import { describe, it, expect } from "vitest";
import { saldoAt, saldoMitte, saldoEnde, saldoAnchor, restMitte, restEnde, collectBudgets } from "../src/utils/saldo.js";

// ── Test-Fixture ─────────────────────────────────────────────────────
function buildCtx(overrides = {}) {
  const accounts = overrides.accounts || [
    { id: "acc-giro",      name: "Giro" },
    { id: "acc-tagesgeld", name: "Tagesgeld" },
  ];
  const cats = overrides.cats || [
    { id: "c-essen",   type: "expense", subs: [{ id: "s-essen" }] },
    { id: "c-baecker", type: "expense", subs: [{ id: "s-baecker" }] },
  ];
  const anchors = overrides.anchors || {};
  const txs = overrides.txs || [];
  const getKumulierterSaldo = (y, m, accId) => {
    if(!accId) return null;
    const accAnchors = anchors[accId] || {};
    const targetIdx = y * 12 + m;
    let bestKey = null, bestIdx = -Infinity;
    Object.keys(accAnchors).forEach(k => {
      const [yK, mK] = k.split("-").map(Number);
      const idx = yK * 12 + mK;
      if(idx <= targetIdx && idx > bestIdx) { bestKey = k; bestIdx = idx; }
    });
    if(!bestKey) return null;
    let saldo = accAnchors[bestKey];
    if(bestIdx === targetIdx) return saldo;
    const [aY, aM] = bestKey.split("-").map(Number);
    let curY = aY, curM = aM + 1;
    if(curM > 11) { curM = 0; curY++; }
    while(curY < y || (curY === y && curM <= m)) {
      txs.forEach(t => {
        if((t.accountId || "acc-giro") !== accId) return;
        if(t._budgetSubId) return;
        if(t._linkedTo) {
          const partner = txs.find(p => p.id === t._linkedTo);
          if(partner && (partner.accountId||"acc-giro") === accId) return;
        }
        const d = new Date(t.date);
        if(d.getFullYear() !== curY || d.getMonth() !== curM) return;
        const type = t._csvType || (t.totalAmount >= 0 ? "income" : "expense");
        const amt = Math.abs(t.totalAmount || 0);
        saldo += (type === "income") ? amt : -amt;
      });
      curM++;
      if(curM > 11) { curM = 0; curY++; }
    }
    return saldo;
  };
  return {
    txs, cats, accounts,
    getKumulierterSaldo,
    // budgets: { [subId]: { amount } } — analog zu App.budgets-State
    // getBudgetForMonth(subId): summiert subId + subId+"_mitte" (wie App.jsx)
    getBudgetForMonth: (subId, y, m) => {
      const b = (overrides.budgets || {})[subId];
      return b ? b.amount : 0;
    },
    today: overrides.today || null,
  };
}

function budgetPlaceholders(year, month, subId, mitte, ende, catId = "c-essen") {
  const lastDay = new Date(year, month+1, 0).getDate();
  const mm = String(month+1).padStart(2,"0");
  return [
    { id: `b-${subId}-mitte`, accountId: "acc-giro", pending: true,
      _budgetSubId: subId + "_mitte", _csvType: "expense",
      date: `${year}-${mm}-14`, totalAmount: mitte,
      splits: [{ catId, subId, amount: mitte }] },
    { id: `b-${subId}-ende`, accountId: "acc-giro", pending: true,
      _budgetSubId: subId, _csvType: "expense",
      date: `${year}-${mm}-${String(lastDay).padStart(2,"0")}`, totalAmount: ende,
      splits: [{ catId, subId, amount: ende }] },
  ];
}

describe("saldoAt — Excel-Logik (User-Spec)", () => {
  describe("Phase 1: Tag 1-14 (Mitte-Reservierung gilt durchgehend)", () => {
    it("Vergangener Tag zeigt reines Ist, künftiger Tag reserviert RestMitte", () => {
      const ctx = buildCtx({
        anchors: { "acc-giro": { "2026-3": 1000 } },
        today: new Date("2026-05-05"),
        txs: [
          { id: "t1", accountId: "acc-giro", date: "2026-05-03", totalAmount: -50, _csvType: "expense",
            splits: [{ catId: "c-essen", subId: "s-essen", amount: -50 }] },
          ...budgetPlaceholders(2026, 4, "s-essen", 100, 200),
        ],
      });
      // Tag 3 ist vergangen (heute 5.) → reines Ist
      expect(saldoAt(2026, 4, 3, "acc-giro", ctx)).toBe(950);
      // Tag 13 ist künftig → RestMitte = max(0, 100-50) = 50 wird reserviert
      // Saldo = 1000 - 50 (Ist) - 50 (RestMitte) = 900
      expect(saldoAt(2026, 4, 13, "acc-giro", ctx)).toBe(900);
    });
  });

  describe("Phase 2: Tag 14 (Mitte-Sprung)", () => {
    it("BudgetMitte unterschritten: RestMitte wird abgezogen", () => {
      const ctx = buildCtx({
        anchors: { "acc-giro": { "2026-3": 1000 } },
        today: new Date("2026-05-05"),
        txs: [
          { id: "t1", accountId: "acc-giro", date: "2026-05-10", totalAmount: -30, _csvType: "expense",
            splits: [{ catId: "c-essen", subId: "s-essen", amount: -30 }] },
          ...budgetPlaceholders(2026, 4, "s-essen", 100, 200),
        ],
      });
      expect(saldoAt(2026, 4, 14, "acc-giro", ctx)).toBe(900);
    });

    it("BudgetMitte überschritten: RestMitte = 0", () => {
      const ctx = buildCtx({
        anchors: { "acc-giro": { "2026-3": 1000 } },
        today: new Date("2026-05-05"),
        txs: [
          { id: "t1", accountId: "acc-giro", date: "2026-05-10", totalAmount: -120, _csvType: "expense",
            splits: [{ catId: "c-essen", subId: "s-essen", amount: -120 }] },
          ...budgetPlaceholders(2026, 4, "s-essen", 100, 200),
        ],
      });
      expect(saldoAt(2026, 4, 14, "acc-giro", ctx)).toBe(880);
    });

    it("Mehrere Kategorien einzeln", () => {
      const ctx = buildCtx({
        anchors: { "acc-giro": { "2026-3": 1000 } },
        today: new Date("2026-05-05"),
        txs: [
          { id: "t1", accountId: "acc-giro", date: "2026-05-10", totalAmount: -30, _csvType: "expense",
            splits: [{ catId: "c-essen", subId: "s-essen", amount: -30 }] },
          { id: "t2", accountId: "acc-giro", date: "2026-05-12", totalAmount: -60, _csvType: "expense",
            splits: [{ catId: "c-baecker", subId: "s-baecker", amount: -60 }] },
          ...budgetPlaceholders(2026, 4, "s-essen", 100, 200, "c-essen"),
          ...budgetPlaceholders(2026, 4, "s-baecker", 50, 100, "c-baecker"),
        ],
      });
      expect(saldoAt(2026, 4, 14, "acc-giro", ctx)).toBe(840);
    });
  });

  describe("Phase 3: Tag 15..letzter (Ende-Reservierung gilt durchgehend)", () => {
    it("Künftiger Tag in der 2. Hälfte reserviert RestEnde (kein Hochspringen am 15.)", () => {
      const ctx = buildCtx({
        anchors: { "acc-giro": { "2026-3": 1000 } },
        today: new Date("2026-05-05"),
        txs: [
          { id: "t1", accountId: "acc-giro", date: "2026-05-10", totalAmount: -30, _csvType: "expense",
            splits: [{ catId: "c-essen", subId: "s-essen", amount: -30 }] },
          { id: "t2", accountId: "acc-giro", date: "2026-05-20", totalAmount: -40, _csvType: "expense",
            splits: [{ catId: "c-essen", subId: "s-essen", amount: -40 }] },
          ...budgetPlaceholders(2026, 4, "s-essen", 100, 200),
        ],
      });
      // Tag 20 (künftig, 2. Hälfte): RestEnde mit Roll-Over.
      // Budget_H2 = max(0, 300-30) = 270, Rest = max(0, 270-40) = 230.
      // Saldo = 1000 - 30 - 40 - 230 = 700 — KEIN Sprung zurück auf 930.
      expect(saldoAt(2026, 4, 20, "acc-giro", ctx)).toBe(700);
      // Tag 30: gleiche RestEnde, gleiches Ist → 700 (Reservierung bleibt bestehen)
      expect(saldoAt(2026, 4, 30, "acc-giro", ctx)).toBe(700);
    });
  });

  describe("Phase 4: letzter Tag (Ende-Sprung mit Roll-Over)", () => {
    it("Mitte sparsam, Ende sparsam: voller Polster", () => {
      const ctx = buildCtx({
        anchors: { "acc-giro": { "2026-3": 1000 } },
        today: new Date("2026-05-05"),
        txs: [
          { id: "t1", accountId: "acc-giro", date: "2026-05-10", totalAmount: -30, _csvType: "expense",
            splits: [{ catId: "c-essen", subId: "s-essen", amount: -30 }] },
          { id: "t2", accountId: "acc-giro", date: "2026-05-20", totalAmount: -40, _csvType: "expense",
            splits: [{ catId: "c-essen", subId: "s-essen", amount: -40 }] },
          ...budgetPlaceholders(2026, 4, "s-essen", 100, 200),
        ],
      });
      // Budget_H2 = 300-30 = 270, Rest = 270-40 = 230
      // Saldo = 1000 - 30 - 40 - 230 = 700
      expect(saldoAt(2026, 4, 31, "acc-giro", ctx)).toBe(700);
    });

    it("Mitte überschritten: frisst H2-Budget mit", () => {
      const ctx = buildCtx({
        anchors: { "acc-giro": { "2026-3": 1000 } },
        today: new Date("2026-05-05"),
        txs: [
          { id: "t1", accountId: "acc-giro", date: "2026-05-10", totalAmount: -120, _csvType: "expense",
            splits: [{ catId: "c-essen", subId: "s-essen", amount: -120 }] },
          { id: "t2", accountId: "acc-giro", date: "2026-05-20", totalAmount: -50, _csvType: "expense",
            splits: [{ catId: "c-essen", subId: "s-essen", amount: -50 }] },
          ...budgetPlaceholders(2026, 4, "s-essen", 100, 200),
        ],
      });
      // Budget_H2 = 300-120 = 180, Rest = 180-50 = 130
      // Saldo = 1000 - 120 - 50 - 130 = 700
      expect(saldoAt(2026, 4, 31, "acc-giro", ctx)).toBe(700);
    });

    it("Beide überschritten: kein Rest, kein Abzug", () => {
      const ctx = buildCtx({
        anchors: { "acc-giro": { "2026-3": 1000 } },
        today: new Date("2026-05-05"),
        txs: [
          { id: "t1", accountId: "acc-giro", date: "2026-05-10", totalAmount: -200, _csvType: "expense",
            splits: [{ catId: "c-essen", subId: "s-essen", amount: -200 }] },
          { id: "t2", accountId: "acc-giro", date: "2026-05-20", totalAmount: -150, _csvType: "expense",
            splits: [{ catId: "c-essen", subId: "s-essen", amount: -150 }] },
          ...budgetPlaceholders(2026, 4, "s-essen", 100, 200),
        ],
      });
      // Budget_H2 = 300-200 = 100, Rest = 100-150 < 0 → 0
      // Saldo = 1000 - 200 - 150 = 650
      expect(saldoAt(2026, 4, 31, "acc-giro", ctx)).toBe(650);
    });
  });

  describe("Zukunftsmonat: Reservierung verfällt nicht am Kalenderwechsel", () => {
    it("Reiner Zukunftsmonat: 13.→14.→15. springt nicht zurück, Anker trägt Ende weiter", () => {
      // Heute = 5. Mai, Juni = reiner Zukunftsmonat.
      const ctx = buildCtx({
        anchors: { "acc-giro": { "2026-3": 1000 } },
        today: new Date("2026-05-05"),
        txs: [
          // Mai-Ende = 1000 (kein Ist, kein Budget im Mai) → Juni-Anker = 1000
          // Juni: Budget 100/200 (gesamt 300), eine Buchung -60 am 20.6.
          { id: "t1", accountId: "acc-giro", date: "2026-06-20", totalAmount: -60, _csvType: "expense",
            splits: [{ catId: "c-essen", subId: "s-essen", amount: -60 }] },
          ...budgetPlaceholders(2026, 5, "s-essen", 100, 200),
        ],
      });
      // 1. Hälfte (kein Ist 1..14): RestMitte = max(0, 100-0) = 100
      //   Tag 13 = 1000 - 0 - 100 = 900
      //   Tag 14 = 1000 - 0 - 100 = 900
      expect(saldoAt(2026, 5, 13, "acc-giro", ctx)).toBe(900);
      expect(saldoAt(2026, 5, 14, "acc-giro", ctx)).toBe(900);
      // 2. Hälfte: RestEnde mit Roll-Over.
      //   Budget_H2 = max(0, 300-0) = 300, Rest = max(0, 300-60) = 240
      //   Tag 15 (vor der Buchung am 20.): Ist 0 → 1000 - 0 - 240 = 760
      //   → KEIN Hochspringen auf 1000, Reservierung bleibt
      expect(saldoAt(2026, 5, 15, "acc-giro", ctx)).toBe(760);
      //   letzter Tag (30.): Ist -60 → 1000 - 60 - 240 = 700
      expect(saldoAt(2026, 5, 30, "acc-giro", ctx)).toBe(700);
      // Ende-Reservierung trägt als Anker in den Juli (Folgemonat)
      expect(saldoAnchor(2026, 6, "acc-giro", ctx)).toBe(700);
    });
  });

  describe("Vergangener Monat: kein Budget-Abzug", () => {
    it("Vergangener Monat: kein Sprung", () => {
      const ctx = buildCtx({
        anchors: { "acc-giro": { "2026-3": 1000 } },
        today: new Date("2026-07-15"),
        txs: [
          { id: "t1", accountId: "acc-giro", date: "2026-05-10", totalAmount: -30, _csvType: "expense",
            splits: [{ catId: "c-essen", subId: "s-essen", amount: -30 }] },
          ...budgetPlaceholders(2026, 4, "s-essen", 100, 200),
        ],
      });
      expect(saldoAt(2026, 4, 14, "acc-giro", ctx)).toBe(970);
      expect(saldoAt(2026, 4, 31, "acc-giro", ctx)).toBe(970);
    });

    it("Aktueller Monat, Tag 14 schon vorbei: kein Mitte-Sprung mehr", () => {
      // Heute = 18.5., Tag 14 ist vergangen → saldoAt(14) zeigt reines Ist
      const ctx = buildCtx({
        anchors: { "acc-giro": { "2026-3": 1000 } },
        today: new Date("2026-05-18"),  // Tag 14 schon vorbei!
        txs: [
          { id: "t1", accountId: "acc-giro", date: "2026-05-10", totalAmount: -30, _csvType: "expense",
            splits: [{ catId: "c-essen", subId: "s-essen", amount: -30 }] },
          ...budgetPlaceholders(2026, 4, "s-essen", 100, 200),
        ],
      });
      // Tag 14: KEIN Sprung mehr (vergangen) → Saldo = 1000 - 30 = 970
      expect(saldoAt(2026, 4, 14, "acc-giro", ctx)).toBe(970);
      // Tag 31: noch nicht vorbei → Ende-Sprung greift
      // Budget_H2 = max(0, 300-30) = 270, Rest = 270-0 = 270
      // Saldo = 1000 - 30 - 270 = 700
      expect(saldoAt(2026, 4, 31, "acc-giro", ctx)).toBe(700);
    });

    it("Aktueller Monat, letzter Tag schon vorbei: weder Mitte- noch Ende-Sprung", () => {
      // Heute = 1.6., Mai komplett vorbei
      const ctx = buildCtx({
        anchors: { "acc-giro": { "2026-3": 1000 } },
        today: new Date("2026-06-01"),
        txs: [
          { id: "t1", accountId: "acc-giro", date: "2026-05-10", totalAmount: -30, _csvType: "expense",
            splits: [{ catId: "c-essen", subId: "s-essen", amount: -30 }] },
          ...budgetPlaceholders(2026, 4, "s-essen", 100, 200),
        ],
      });
      expect(saldoAt(2026, 4, 14, "acc-giro", ctx)).toBe(970);
      expect(saldoAt(2026, 4, 31, "acc-giro", ctx)).toBe(970);
    });
  });

  describe("Tagesgeld: kein Budget-Abzug", () => {
    it("Tagesgeld hat keinen Sprung", () => {
      const ctx = buildCtx({
        anchors: { "acc-tagesgeld": { "2026-3": 5000 } },
        today: new Date("2026-05-05"),
        txs: [
          { id: "t1", accountId: "acc-tagesgeld", date: "2026-05-10", totalAmount: 200, _csvType: "income" },
        ],
      });
      expect(saldoAt(2026, 4, 14, "acc-tagesgeld", ctx)).toBe(5200);
      expect(saldoAt(2026, 4, 31, "acc-tagesgeld", ctx)).toBe(5200);
    });
  });

  describe("Konten-Transfer (Sparen)", () => {
    it("Transfer: −auf Quelle, +auf Ziel, 0 in Gesamt", () => {
      const ctx = buildCtx({
        anchors: {
          "acc-giro":      { "2026-3": 1000 },
          "acc-tagesgeld": { "2026-3": 500 },
        },
        today: new Date("2026-05-05"),
        txs: [
          { id: "ab", accountId: "acc-giro",      date: "2026-05-15", totalAmount: -100, _csvType: "expense" },
          { id: "zu", accountId: "acc-tagesgeld", date: "2026-05-15", totalAmount:  100, _csvType: "income",
            _linkedTo: "ab", desc: "Tagesgeld-Sparen Unterhalt Matteo" },
        ],
      });
      expect(saldoAt(2026, 4, 20, "acc-giro",      ctx)).toBe(900);
      expect(saldoAt(2026, 4, 20, "acc-tagesgeld", ctx)).toBe(600);
      expect(saldoAt(2026, 4, 20, null,            ctx)).toBe(1500);
    });
  });

  describe("CSV-Verknüpfung", () => {
    it("_linkedTo auf gleichem Konto = ausgefiltert", () => {
      const ctx = buildCtx({
        anchors: { "acc-giro": { "2026-3": 1000 } },
        today: new Date("2026-05-05"),
        txs: [
          { id: "real1", accountId: "acc-giro", date: "2026-05-10", totalAmount: -100, _csvType: "expense", pending: false },
          { id: "pend1", accountId: "acc-giro", date: "2026-05-10", totalAmount: -100, _csvType: "expense",
            pending: false, _linkedTo: "real1", desc: "Miete" },
        ],
      });
      expect(saldoAt(2026, 4, 20, "acc-giro", ctx)).toBe(900);
    });

    it("Zuordnung auf Tagesgeld: Vormerkung mit Buchungs-Konto = Duplikat (absorbiert)", () => {
      // Regression: Beim Zuordnen wird das Konto der echten Buchung uebernommen.
      // Beide auf acc-tagesgeld → _linkedTo gilt als CSV-Duplikat (gleiches Konto),
      // nicht als Sparen-Transfer. Der Betrag darf nur EINMAL zaehlen.
      const ctx = buildCtx({
        anchors: { "acc-tagesgeld": { "2026-3": 500 } },
        today: new Date("2026-05-05"),
        txs: [
          { id: "realT", accountId: "acc-tagesgeld", date: "2026-05-10", totalAmount: -50, _csvType: "expense", pending: false },
          // ehemals pending, jetzt zugeordnet → pending:false, _linkedTo + accountId der Buchung
          { id: "pendT", accountId: "acc-tagesgeld", date: "2026-05-10", totalAmount: -50, _csvType: "expense",
            pending: false, _linkedTo: "realT", desc: "Sparrate" },
        ],
      });
      // Nur −50 (Duplikat absorbiert), nicht −100. Giro bleibt unberuehrt.
      expect(saldoAt(2026, 4, 20, "acc-tagesgeld", ctx)).toBe(450);
      expect(saldoAt(2026, 4, 20, "acc-giro",      ctx)).toBe(0);
    });

    it("CSV-Duplikat mit Budget-Sub zählt nur EINMAL im Budget-Verbrauch", () => {
      // Regression: Eine Vormerkung, die mit einer Bank-Buchung verknüpft wurde,
      // hinterlässt zwei echte Buchungen mit derselben subId (eine davon _linkedTo).
      // istForSub (und analog die Budget-Aufschlüsselung in App.jsx) darf den
      // _linkedTo-Duplikat NICHT mitzählen, sonst wird "genutzt" doppelt so hoch.
      const ctx = buildCtx({
        anchors: { "acc-giro": { "2026-3": 1000 } },
        today: new Date("2026-05-05"),
        txs: [
          { id: "real1", accountId: "acc-giro", date: "2026-05-10", totalAmount: -120, _csvType: "expense",
            pending: false, splits: [{ catId: "c-essen", subId: "s-essen", amount: -120 }] },
          // verknüpftes Duplikat (gleiche subId, gleiches Konto) → muss ausgefiltert werden
          { id: "dup1", accountId: "acc-giro", date: "2026-05-10", totalAmount: -120, _csvType: "expense",
            pending: false, _linkedTo: "real1", desc: "Penny",
            splits: [{ catId: "c-essen", subId: "s-essen", amount: -120 }] },
          ...budgetPlaceholders(2026, 4, "s-essen", 100, 200),
        ],
      });
      // Verbrauch s-essen = 120 (NICHT 240). Budget_H2 = 300-120 = 180, Rest = 180.
      // ist(ganzer Monat, ohne Dupl) = -120.  Saldo = 1000 - 120 - 180 = 700.
      // Bei Doppelzählung wäre Budget_H2 = 60 → Saldo 820.
      expect(saldoAt(2026, 4, 31, "acc-giro", ctx)).toBe(700);
    });
  });

  describe("Mitte/Ende Wrapper", () => {
    it("saldoMitte/saldoEnde", () => {
      const ctx = buildCtx({
        anchors: { "acc-giro": { "2026-3": 1000 } },
        today: new Date("2026-05-05"),
      });
      expect(saldoMitte(2026, 4, "acc-giro", ctx)).toBe(saldoAt(2026, 4, 14, "acc-giro", ctx));
      expect(saldoEnde(2026, 4, "acc-giro", ctx)).toBe(saldoAt(2026, 4, 31, "acc-giro", ctx));
    });
  });

  describe("Anker", () => {
    it("Anfangssaldo = Saldo Ende Vormonat", () => {
      const ctx = buildCtx({
        anchors: { "acc-giro": { "2026-3": 1500 } },
        today: new Date("2026-05-05"),
      });
      expect(saldoAnchor(2026, 4, "acc-giro", ctx)).toBe(1500);
    });

    it("Anker Folgemonat = saldoEnde aktueller Monat INKL Budget-Sprung", () => {
      // Mai ist aktueller Monat mit Budget-Reservierung.
      // Juni-Anker soll Mai-ENDE = Mai-Anker + Ist - RestEnde sein.
      const ctx = buildCtx({
        anchors: { "acc-giro": { "2026-3": 1000 } },
        today: new Date("2026-05-05"),  // Mai = aktueller Monat
        txs: [
          // Mai: Ist 30, Budget 100/300 → RestEnde = max(0, 300-30) = 270
          { id: "t1", accountId: "acc-giro", date: "2026-05-10", totalAmount: -30, _csvType: "expense",
            splits: [{ catId: "c-essen", subId: "s-essen", amount: -30 }] },
          ...budgetPlaceholders(2026, 4, "s-essen", 100, 200),
        ],
      });
      // Mai-ENDE = 1000 - 30 - 270 = 700
      // Juni-Anker sollte 700 sein
      expect(saldoEnde(2026, 4, "acc-giro", ctx)).toBe(700);
      expect(saldoAnchor(2026, 5, "acc-giro", ctx)).toBe(700);
    });

    it("Anker Folgemonat-Folgemonat = saldoEnde Folgemonat OHNE Budget-Sprung im allerletzten Anker (nur initial)", () => {
      // Mai aktueller Monat, Juni nächster. Juli-Anker soll Juni-ENDE inkl. Budget-Sprung sein.
      const ctx = buildCtx({
        anchors: { "acc-giro": { "2026-3": 1000 } },
        today: new Date("2026-05-05"),
        txs: [
          // Mai: Ist 30 → Mai-Ende = 1000 - 30 - 270 = 700
          { id: "t1", accountId: "acc-giro", date: "2026-05-10", totalAmount: -30, _csvType: "expense",
            splits: [{ catId: "c-essen", subId: "s-essen", amount: -30 }] },
          ...budgetPlaceholders(2026, 4, "s-essen", 100, 200),
          // Juni: Ist 40 → Juni-Anker 700, Juni-Ist 40, RestEnde Juni = max(0, 300-40) = 260
          // Juni-Ende = 700 - 40 - 260 = 400
          { id: "t2", accountId: "acc-giro", date: "2026-06-10", totalAmount: -40, _csvType: "expense",
            splits: [{ catId: "c-essen", subId: "s-essen", amount: -40 }] },
          ...budgetPlaceholders(2026, 5, "s-essen", 100, 200),
        ],
      });
      expect(saldoAnchor(2026, 5, "acc-giro", ctx)).toBe(700);   // Juni-Anker = Mai-Ende
      expect(saldoEnde(2026, 5, "acc-giro", ctx)).toBe(400);     // Juni-Ende
      expect(saldoAnchor(2026, 6, "acc-giro", ctx)).toBe(400);   // Juli-Anker = Juni-Ende
    });
  });

  describe("Budget-Fallback ohne _budgetSubId-Platzhalter", () => {
    it("Tanken-Fall: Budget existiert nur im budgets-Objekt, kein Platzhalter angelegt", () => {
      // Replikation des Bugs: User legt Tanken mit Mitte=0, Gesamt=100 an
      // → App speichert in budgets, aber legt KEINEN _budgetSubId-Platzhalter an
      const ctx = buildCtx({
        cats: [
          { id: "c-essen",  type: "expense", subs: [{ id: "s-essen" }] },
          { id: "c-tanken", type: "expense", subs: [{ id: "s-tanken" }] },
        ],
        anchors: { "acc-giro": { "2026-3": 1000 } },
        today: new Date("2026-05-05"),
        budgets: {
          "s-tanken": { amount: 100 },  // Gesamtbudget 100, kein Platzhalter
        },
        txs: [
          // Essen normal mit Platzhaltern
          { id: "t1", accountId: "acc-giro", date: "2026-05-10", totalAmount: -30, _csvType: "expense",
            splits: [{ catId: "c-essen", subId: "s-essen", amount: -30 }] },
          ...budgetPlaceholders(2026, 4, "s-essen", 100, 200, "c-essen"),
          // Tanken: keine Platzhalter, kein Ist
        ],
      });
      // Tag 14: Essen Mitte = max(0, 100-30) = 70. Tanken hat NUR Gesamt (kein
      // Mitte) → volles Gesamt schon ab Tag 1 reserviert = max(0, 100-0) = 100.
      // Saldo = 1000 - 30 - 70 - 100 = 800
      expect(saldoAt(2026, 4, 14, "acc-giro", ctx)).toBe(800);
      // Tag 31: Essen Budget_H2 = max(0, 300-30) = 270. Rest = 270-0 = 270.
      // Tanken: Budget 100, Ist 0 → Budget_H2 = 100, Rest = 100. ABGEZOGEN!
      // Saldo = 1000 - 30 - 270 - 100 = 600
      expect(saldoAt(2026, 4, 31, "acc-giro", ctx)).toBe(600);
    });
  });

  describe("Nur Gesamt-Budget (kein Mitte-Anteil)", () => {
    it("volles Gesamt-Budget schon ab Tag 1 reserviert, durchgehend", () => {
      // Zukunftsmonat Juni, nur Ende-/Gesamt-Platzhalter (mitte=0), Gesamt 300
      const ctx = buildCtx({
        anchors: { "acc-giro": { "2026-3": 1000 } },
        today: new Date("2026-05-05"),
        txs: [
          { id: "be", accountId: "acc-giro", pending: true, _budgetSubId: "s-essen",
            _csvType: "expense", date: "2026-06-30", totalAmount: 300,
            splits: [{ catId: "c-essen", subId: "s-essen", amount: 300 }] },
        ],
      });
      // Kein Ist. RestMitte fällt auf Gesamt zurück = 300, RestEnde = 300.
      expect(restMitte(2026, 5, ctx)).toBe(300);
      expect(restEnde(2026, 5, ctx)).toBe(300);
      // Tag 1..14 (1. Hälfte): 1000 - 300 = 700
      expect(saldoAt(2026, 5, 1,  "acc-giro", ctx)).toBe(700);
      expect(saldoAt(2026, 5, 14, "acc-giro", ctx)).toBe(700);
      // Tag 15..letzter (2. Hälfte): 1000 - 300 = 700 — kein Sprung
      expect(saldoAt(2026, 5, 15, "acc-giro", ctx)).toBe(700);
      expect(saldoAt(2026, 5, 30, "acc-giro", ctx)).toBe(700);
    });

    it("mit Ist: Reservierung schrumpft korrekt (max(0, Gesamt-Ist))", () => {
      const ctx = buildCtx({
        anchors: { "acc-giro": { "2026-3": 1000 } },
        today: new Date("2026-05-05"),
        txs: [
          { id: "t1", accountId: "acc-giro", date: "2026-06-05", totalAmount: -50, _csvType: "expense",
            splits: [{ catId: "c-essen", subId: "s-essen", amount: -50 }] },
          { id: "be", accountId: "acc-giro", pending: true, _budgetSubId: "s-essen",
            _csvType: "expense", date: "2026-06-30", totalAmount: 300,
            splits: [{ catId: "c-essen", subId: "s-essen", amount: 300 }] },
        ],
      });
      // Tag 10 (1. Hälfte): RestMitte = max(0, 300-50) = 250, Ist(1..10)=-50
      //   Saldo = 1000 - 50 - 250 = 700
      expect(saldoAt(2026, 5, 10, "acc-giro", ctx)).toBe(700);
    });
  });

  describe("Tanken-Beispiel (User-Spec): 100 €, jeden Tag nutzbar", () => {
    // nur ein Ende-/Gesamt-Budget (kein Mitte-Anteil) für Juni
    function tankenCtx(today) {
      return buildCtx({
        cats: [{ id: "c-tanken", type: "expense", subs: [{ id: "s-tanken" }] }],
        anchors: { "acc-giro": { "2026-3": 1000 } },
        today,
        txs: [
          { id: "bt", accountId: "acc-giro", pending: true, _budgetSubId: "s-tanken",
            _csvType: "expense", date: "2026-06-30", totalAmount: 100,
            splits: [{ catId: "c-tanken", subId: "s-tanken", amount: 100 }] },
        ],
      });
    }

    it("Regel 3: nur Ende-Budget gilt als Gesamt 1.–Letzter (durchgehend 100 reserviert)", () => {
      const ctx = tankenCtx(new Date("2026-05-15")); // Juni = Zukunftsmonat
      [1, 7, 14, 15, 20, 30].forEach(d => {
        expect(saldoAt(2026, 5, d, "acc-giro", ctx)).toBe(900);
      });
    });

    it("Reservierung schrumpft mit Nutzung, bleibt aber den ganzen Monat bestehen", () => {
      const ctx = tankenCtx(new Date("2026-05-15"));
      // 40 € am 5.6. getankt → Reservierung = max(0, 100-40) = 60, bereits 40 ausgegeben
      ctx.txs.push({ id: "t", accountId: "acc-giro", date: "2026-06-05", totalAmount: -40,
        _csvType: "expense", splits: [{ catId: "c-tanken", subId: "s-tanken", amount: -40 }] });
      // Vor und nach dem 15.: durchgehend 1000 - 40 - 60 = 900
      expect(saldoAt(2026, 5, 10, "acc-giro", ctx)).toBe(900);
      expect(saldoAt(2026, 5, 20, "acc-giro", ctx)).toBe(900);
    });

    it("Regel 2: Anker trägt Reservierung weiter, solange Juni nicht vergangen", () => {
      const ctx = tankenCtx(new Date("2026-05-15")); // Juni Zukunft
      // Juni-Ende-Prognose = 900 → Juli-Anker = 900
      expect(saldoAnchor(2026, 6, "acc-giro", ctx)).toBe(900);
    });

    it("Regel 2: unbenutztes Budget fällt erst am 1. des Folgemonats weg", () => {
      // Heute Juli → Juni ist vergangen, kein realer Verbrauch → Juni-Endstand = 1000
      const ctx = tankenCtx(new Date("2026-07-15"));
      expect(saldoAnchor(2026, 6, "acc-giro", ctx)).toBe(1000);
    });
  });

  describe("Roll-Over (User-Spec Regel 1): ungenutztes Mitte rollt in die 2. Hälfte", () => {
    it("Mitte 40 / Ende 60: ungenutztes Mitte erhöht den 2.-Hälfte-Topf", () => {
      const ctx = buildCtx({
        anchors: { "acc-giro": { "2026-3": 1000 } },
        today: new Date("2026-05-15"), // Juni Zukunft
        txs: [
          // 10 € in der 1. Hälfte verbraucht
          { id: "t1", accountId: "acc-giro", date: "2026-06-05", totalAmount: -10, _csvType: "expense",
            splits: [{ catId: "c-essen", subId: "s-essen", amount: -10 }] },
          ...budgetPlaceholders(2026, 5, "s-essen", 40, 60),
        ],
      });
      // Tag 14 (1. Hälfte): nur Mitte gilt. RestMitte = max(0, 40-10) = 30.
      //   Saldo = 1000 - 10 - 30 = 960
      expect(saldoAt(2026, 5, 14, "acc-giro", ctx)).toBe(960);
      // Tag 15 (2. Hälfte): Ende greift + ungenutztes Mitte rollt dazu.
      //   Budget_H2 = max(0, 100-10) = 90 (= 60 Ende + 30 ungenutztes Mitte), Rest = 90.
      //   Saldo = 1000 - 10 - 90 = 900
      expect(saldoAt(2026, 5, 15, "acc-giro", ctx)).toBe(900);
      expect(saldoAt(2026, 5, 30, "acc-giro", ctx)).toBe(900);
    });
  });

  describe("Mehrere Monate (Rekursion)", () => {
    it("Saldo zieht sich korrekt durch Monate", () => {
      const ctx = buildCtx({
        anchors: { "acc-giro": { "2026-3": 1000 } },
        today: new Date("2026-05-05"),
        txs: [
          { id: "t1", accountId: "acc-giro", date: "2026-05-15", totalAmount: -100, _csvType: "expense" },
          { id: "t2", accountId: "acc-giro", date: "2026-06-15", totalAmount: -50,  _csvType: "expense" },
          { id: "t3", accountId: "acc-giro", date: "2026-07-15", totalAmount: 200,  _csvType: "income"  },
        ],
      });
      // saldoAt(2026-4, 31) — letzter Tag Mai → würde Ende-Sprung machen, aber Mai = aktueller
      // Monat im Test. Wenn today=2026-05-05 ist, ist Mai der aktuelle Monat.
      // Aber: keine Budget-Platzhalter → RestEnde = 0
      expect(saldoAt(2026, 4, 31, "acc-giro", ctx)).toBe(900);
      expect(saldoAt(2026, 5, 14, "acc-giro", ctx)).toBe(900);  // Mitte Juni
      expect(saldoAt(2026, 5, 30, "acc-giro", ctx)).toBe(850);  // letzter Juni (Sprung 0)
      expect(saldoAt(2026, 6, 31, "acc-giro", ctx)).toBe(1050); // letzter Juli (Sprung 0)
    });
  });
});
