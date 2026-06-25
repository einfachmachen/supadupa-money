import { describe, it, expect } from "vitest";
import { suggestBudget } from "../src/utils/budgetSuggest.js";

// Helfer: baut getActual/getPending aus Maps "y-m" → Betrag. Jetzt = Jun 2026.
const lookup = (map) => (y, m) => map[`${y}-${m}`] || 0;
const NOW = { nowY: 2026, nowM: 5 };

describe("suggestBudget — gewichteter Schnitt aus Ist + Vormerkungen", () => {
  it("ohne Daten → kein Vorschlag", () => {
    const r = suggestBudget({ ...NOW, getActual: () => 0, getPending: () => 0 });
    expect(r.hasData).toBe(false);
    expect(r.amount).toBe(0);
  });

  it("konstante Ist-Ausgaben → Vorschlag = dieser Betrag", () => {
    // 300 € in Mär/Apr/Mai 2026 (die 3 abgeschlossenen Monate vor Jun).
    const past = { "2026-2": 300, "2026-3": 300, "2026-4": 300 };
    const r = suggestBudget({ ...NOW, getActual: lookup(past), getPending: () => 0 });
    expect(Math.round(r.amount)).toBe(300);
    expect(r.actualMonths).toBe(3);
    expect(r.pendingMonths).toBe(0);
  });

  it("legt seltene (jährliche) Kosten anteilig auf den Monat um", () => {
    // 1200 € einmalig vor 12 Monaten (Jun 2025), sonst nichts → Fenster bis zum
    // letzten abgeschlossenen Monat (Mai 2026) = 12 Monate → 1200/12 = 100.
    const past = { "2025-5": 1200 };
    const r = suggestBudget({ ...NOW, getActual: lookup(past), getPending: () => 0 });
    expect(Math.round(r.amount)).toBe(100);
    expect(r.months).toBe(12);
  });

  it("unterschätzt eine neue Kategorie NICHT (keine Alt-Nullen davor)", () => {
    // Erst seit 3 Monaten aktiv (300/Monat) → Vorschlag 300, nicht /12.
    const past = { "2026-2": 300, "2026-3": 300, "2026-4": 300 };
    const r = suggestBudget({ ...NOW, getActual: lookup(past), getPending: () => 0 });
    expect(Math.round(r.amount)).toBe(300);
  });

  it("gewichtet Ist höher als Vormerkungen", () => {
    // Mai 2026 Ist 600 (Gewicht 2), Jun 0, Jul 2026 Vormerkung 300 (Gewicht 1).
    // (600*2 + 0 + 300) / (2+1+1) = 1500/4 = 375.
    const past = { "2026-4": 600 };
    const fut = { "2026-6": 300 };
    const r = suggestBudget({ ...NOW, getActual: lookup(past), getPending: lookup(fut) });
    expect(Math.round(r.amount)).toBe(375);
    expect(r.actualMonths).toBe(1);
    expect(r.pendingMonths).toBe(2);
  });

  it("nur Vormerkungen (neue wiederkehrende Ausgabe ohne Historie)", () => {
    const fut = { "2026-6": 250, "2026-7": 250, "2026-8": 250 };
    const r = suggestBudget({ ...NOW, getActual: () => 0, getPending: lookup(fut) });
    expect(Math.round(r.amount)).toBe(250);
    expect(r.actualMonths).toBe(0);
    expect(r.pendingMonths).toBe(3);
  });

  it("monatliche Zahlung → interval 1, intervalAmount = Monatsbetrag", () => {
    const past = { "2026-2": 300, "2026-3": 300, "2026-4": 300 };
    const r = suggestBudget({ ...NOW, getActual: lookup(past), getPending: () => 0 });
    expect(r.interval).toBe(1);
    expect(Math.round(r.intervalAmount)).toBe(300);
  });

  it("quartalsweise Zahlung (z. B. Rundfunkbeitrag) → interval 3, intervalAmount = Quartalssumme", () => {
    // 60 € alle 3 Monate: Jun/Sep/Dez 2025 + Mär 2026 (alles vor Jun 2026).
    const past = { "2025-5": 60, "2025-8": 60, "2025-11": 60, "2026-2": 60 };
    const r = suggestBudget({ ...NOW, getActual: lookup(past), getPending: () => 0 });
    expect(r.interval).toBe(3);
    expect(Math.round(r.intervalAmount)).toBe(60); // 20 €/Mon × 3
  });

  it("jährliche Zahlung mit zwei Vorkommen → interval 12", () => {
    const past = { "2024-5": 1200, "2025-5": 1200 };
    const r = suggestBudget({ ...NOW, getActual: lookup(past), getPending: () => 0 });
    expect(r.interval).toBe(12);
    expect(Math.round(r.intervalAmount)).toBe(1200);
  });
});
