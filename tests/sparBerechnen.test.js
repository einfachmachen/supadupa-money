import { describe, it, expect } from "vitest";
import { computeMinTagessaldo } from "../src/utils/sparBerechnen.js";

// Minimaler Kontext: keine Budgets, keine Kategorien nötig für diese Fälle.
function buildCtx({ txs, giroAnchorPrevMonth }) {
  return {
    txs,
    cats: [],
    accounts: [{ id: "acc-giro", name: "Giro" }],
    getKumulierterSaldo: () => giroAnchorPrevMonth,
    getCat: () => null,
    getBudgetForMonth: () => 0,
    getProgEndeAccGlobal: () => giroAnchorPrevMonth,
  };
}

// Szenario, das genau Dirks Beschreibung nachbildet: unerwartete Mehrausgaben
// im laufenden Monat (Urlaub) VOR dem Gehaltseingang lassen den Tagessaldo
// unter den Puffer fallen — die bestehende (zu hohe) Sparrate soll dadurch
// automatisch reduziert werden können (App.jsx nutzt exakt diese Formel:
// safeAmount = max(0, floor(minTag - puffer))).
describe("computeMinTagessaldo — automatische Sparraten-Anpassung", () => {
  const today = new Date("2026-07-20");
  const puffer = 100;

  it("großer Urlaubs-Ausgabe-Peak vor dem Gehalt: Sparrate müsste auf 0 sinken", () => {
    const txs = [
      { id: "e1", accountId: "acc-giro", date: "2026-07-05", totalAmount: -300, pending: false, _csvType: "expense", splits: [] },
      { id: "e2", accountId: "acc-giro", date: "2026-07-15", totalAmount: -1500, pending: true, _csvType: "expense", splits: [] },
      { id: "inc", accountId: "acc-giro", date: "2026-07-28", totalAmount: 1800, pending: true, _csvType: "income", splits: [] },
      { id: "spar-abgang", accountId: "acc-giro", date: "2026-07-31", totalAmount: -500, pending: true, _csvType: "expense",
        desc: "Sparen·Test", _seriesId: "s1", splits: [{ id: "sp1", catId: "", subId: "", amount: -500 }] },
    ];
    const ctx = buildCtx({ txs, giroAnchorPrevMonth: 1000 });
    const { min } = computeMinTagessaldo(2026, 6, {}, "acc-giro", "Sparen·Test", ctx, today);
    expect(min).toBe(-800);
    const safeAmount = Math.max(0, Math.floor(min - puffer));
    expect(safeAmount).toBe(0);
  });

  it("kleinere Mehrausgabe: Sparrate sinkt, aber nicht auf 0", () => {
    const txs = [
      { id: "e1", accountId: "acc-giro", date: "2026-07-05", totalAmount: -300, pending: false, _csvType: "expense", splits: [] },
      { id: "e2", accountId: "acc-giro", date: "2026-07-15", totalAmount: -300, pending: true, _csvType: "expense", splits: [] },
      { id: "inc", accountId: "acc-giro", date: "2026-07-28", totalAmount: 1800, pending: true, _csvType: "income", splits: [] },
      { id: "spar-abgang", accountId: "acc-giro", date: "2026-07-31", totalAmount: -500, pending: true, _csvType: "expense",
        desc: "Sparen·Test", _seriesId: "s1", splits: [{ id: "sp1", catId: "", subId: "", amount: -500 }] },
    ];
    const ctx = buildCtx({ txs, giroAnchorPrevMonth: 1000 });
    const { min } = computeMinTagessaldo(2026, 6, {}, "acc-giro", "Sparen·Test", ctx, today);
    expect(min).toBe(400);
    const safeAmount = Math.max(0, Math.floor(min - puffer));
    expect(safeAmount).toBe(300); // < alte Rate (500) → wird reduziert, aber bleibt > 0
  });

  it("nach Gehaltseingang (Tag der Delle liegt in der Vergangenheit): Sparrate erholt sich wieder", () => {
    // Exakt dieselben Buchungen wie im ersten Fall (Sparrate war auf 0
    // reduziert worden) — nur "heute" ist jetzt der 29., also NACH der
    // Ausgabendelle (15.) und nach dem Gehaltseingang (28.). Vergangene Tage
    // zählen nicht mehr in die Tiefst-Saldo-Suche (siehe computeMinTagessaldo),
    // die Sparrate darf sich also automatisch wieder erhöhen.
    const txs = [
      { id: "e1", accountId: "acc-giro", date: "2026-07-05", totalAmount: -300, pending: false, _csvType: "expense", splits: [] },
      { id: "e2", accountId: "acc-giro", date: "2026-07-15", totalAmount: -1500, pending: true, _csvType: "expense", splits: [] },
      { id: "inc", accountId: "acc-giro", date: "2026-07-28", totalAmount: 1800, pending: true, _csvType: "income", splits: [] },
      { id: "spar-abgang", accountId: "acc-giro", date: "2026-07-31", totalAmount: 0, pending: true, _csvType: "expense",
        desc: "Sparen·Test", _seriesId: "s1", splits: [{ id: "sp1", catId: "", subId: "", amount: 0 }] },
    ];
    const ctx = buildCtx({ txs, giroAnchorPrevMonth: 1000 });
    const afterGehalt = new Date("2026-07-29");
    const { min } = computeMinTagessaldo(2026, 6, {}, "acc-giro", "Sparen·Test", ctx, afterGehalt);
    expect(min).toBe(1000);
    const safeAmount = Math.max(0, Math.floor(min - puffer));
    expect(safeAmount).toBe(900); // > alte Rate (0) → wird automatisch wieder erhöht
  });

  it("genug Spielraum vorhanden: keine Reduzierung nötig", () => {
    const txs = [
      { id: "e1", accountId: "acc-giro", date: "2026-07-05", totalAmount: -100, pending: false, _csvType: "expense", splits: [] },
      { id: "inc", accountId: "acc-giro", date: "2026-07-10", totalAmount: 1800, pending: true, _csvType: "income", splits: [] },
      { id: "spar-abgang", accountId: "acc-giro", date: "2026-07-31", totalAmount: -500, pending: true, _csvType: "expense",
        desc: "Sparen·Test", _seriesId: "s1", splits: [{ id: "sp1", catId: "", subId: "", amount: -500 }] },
    ];
    const ctx = buildCtx({ txs, giroAnchorPrevMonth: 1000 });
    const { min } = computeMinTagessaldo(2026, 6, {}, "acc-giro", "Sparen·Test", ctx, today);
    const safeAmount = Math.max(0, Math.floor(min - puffer));
    expect(safeAmount).toBeGreaterThanOrEqual(500); // alte Rate bleibt sicher, keine Änderung
  });
});
