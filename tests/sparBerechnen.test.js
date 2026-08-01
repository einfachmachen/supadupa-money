import { describe, it, expect } from "vitest";
import { computeMinTagessaldo, computeSafeCurrentMonthAmount, computeTagessaldoAt } from "../src/utils/sparBerechnen.js";

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

// Regression (Nutzer-Bericht): ein Liquiditäts-Engpass in einem FERNEN
// Folgemonat (z.B. 9 Monate später) ließe sich sofort vermeiden, indem die
// Sparrate des LAUFENDEN Monats entsprechend reduziert wird — die
// Sparbuchung eines Monatsletzten wirkt sich als fester Betrag auf JEDEN
// Folgemonat aus. Die einfache "nur den laufenden Monat selbst prüfen"-
// Logik hatte das übersehen, weil der laufende Monat für sich allein
// genügend Spielraum hatte (Engpass lag ausschließlich am fernen
// Folgemonat).
describe("computeSafeCurrentMonthAmount — Engpass in fernem Folgemonat vermeiden", () => {
  const today = new Date("2026-07-30");
  const puffer = 100;

  // Kontext OHNE getProgEndeAccGlobal: erzwingt den saldoEnde-Fallback in
  // computeMinTagessaldo, der auch mit dem hypothetisch veränderten Betrag
  // der laufenden Monats-Buchung korrekt rechnet (siehe computeMinTagessaldo-
  // Kommentar zu getProgEndeAccGlobal).
  function buildCtxNoCache({ txs, giroAnchorPrevMonth }) {
    return {
      txs,
      cats: [],
      accounts: [{ id: "acc-giro", name: "Giro" }],
      getKumulierterSaldo: () => giroAnchorPrevMonth,
      getCat: () => null,
      getBudgetForMonth: () => 0,
      // KEIN getProgEndeAccGlobal — bewusst.
    };
  }

  it("reduziert die laufende Sparrate genau so weit, dass ein Engpass 2 Monate später vermieden wird", () => {
    const txs = [
      // Juli: nur die Sparplan-Buchung, sonst nichts — für sich allein hat
      // Juli reichlich Spielraum (Anker 1000, Puffer 100 → bis zu 900 möglich).
      { id: "spar-abgang", accountId: "acc-giro", date: "2026-07-31", totalAmount: -269, pending: true, _csvType: "expense",
        desc: "Sparen·Tagesgeld", _seriesId: "s1", splits: [{ id: "sp1", catId: "", subId: "", amount: -269 }] },
      // August: keine Buchungen.
      // September: eine große, bereits bestehende Ausgabe von 700 € am 15. —
      // das ist der eigentliche Auslöser des fernen Engpasses.
      { id: "e-sep", accountId: "acc-giro", date: "2026-09-15", totalAmount: -700, pending: true, _csvType: "expense", splits: [] },
    ];
    const ctx = buildCtxNoCache({ txs, giroAnchorPrevMonth: 1000 });

    const safeAmount = computeSafeCurrentMonthAmount({
      y: 2026, m: 6, puffer, abgangId: "spar-abgang", abgangDesc: "Sparen·Tagesgeld",
      ctx, today, horizonMonths: 3,
    });

    // 1000 (Anker) − 269 (Sparrate) − 700 (Septemberausgabe) = 31 → 69 € unter
    // Puffer (100). Die Sparrate muss um genau diese 69 € sinken: 269 − 69 = 200.
    expect(safeAmount).toBe(200);
  });

  it("bleibt stabil, wenn der Folgemonats-Engpass bereits behoben ist (keine Oszillation)", () => {
    // Dieselbe Situation, aber die Sparrate ist bereits auf den zuvor
    // ermittelten sicheren Wert (200) gesetzt — ein erneuter Durchlauf darf
    // NICHT wieder auf 269 erhöhen (das würde den Engpass sofort wieder
    // aufreißen und zwischen 200 und 269 hin- und herpendeln).
    const txs = [
      { id: "spar-abgang", accountId: "acc-giro", date: "2026-07-31", totalAmount: -200, pending: true, _csvType: "expense",
        desc: "Sparen·Tagesgeld", _seriesId: "s1", splits: [{ id: "sp1", catId: "", subId: "", amount: -200 }] },
      { id: "e-sep", accountId: "acc-giro", date: "2026-09-15", totalAmount: -700, pending: true, _csvType: "expense", splits: [] },
    ];
    const ctx = buildCtxNoCache({ txs, giroAnchorPrevMonth: 1000 });

    const safeAmount = computeSafeCurrentMonthAmount({
      y: 2026, m: 6, puffer, abgangId: "spar-abgang", abgangDesc: "Sparen·Tagesgeld",
      ctx, today, horizonMonths: 3,
    });

    expect(safeAmount).toBe(200); // bleibt bei 200, keine Rückkehr zu 269
  });

  it("lässt die Sparrate unverändert, wenn kein Folgemonat betroffen ist", () => {
    const txs = [
      { id: "spar-abgang", accountId: "acc-giro", date: "2026-07-31", totalAmount: -269, pending: true, _csvType: "expense",
        desc: "Sparen·Tagesgeld", _seriesId: "s1", splits: [{ id: "sp1", catId: "", subId: "", amount: -269 }] },
    ];
    const ctx = buildCtxNoCache({ txs, giroAnchorPrevMonth: 1000 });

    const safeAmount = computeSafeCurrentMonthAmount({
      y: 2026, m: 6, puffer, abgangId: "spar-abgang", abgangDesc: "Sparen·Tagesgeld",
      ctx, today, horizonMonths: 3,
    });

    expect(safeAmount).toBe(900); // eigener Spielraum in Juli: 1000 − 100 Puffer
  });
});

// computeTagessaldoAt ist die Grundlage des Zins-Sweeps (utils/zinsSweep.js).
// Dessen Fenster läuft vom Monatsletzten bis zum nächsten Banktag und
// überschreitet damit die Monatsgrenze — hier wird geprüft, dass die dünne
// Hülle wirklich dieselbe Rechnung wie computeMinTagessaldo liefert.
describe("computeTagessaldoAt — taggenauer Saldo über die Monatsgrenze", () => {
  const today = new Date("2026-08-01");
  // Anker: Endsaldo des jeweiligen Vormonats. Für einen sauberen Testfall
  // liefert der Mock durchgehend denselben Startwert.
  const txs = [
    { id: "s1", accountId: "acc-giro", date: "2026-09-25", totalAmount: 2500, pending: true, _csvType: "income", splits: [] },
    { id: "s2", accountId: "acc-giro", date: "2026-09-30", totalAmount: -584, pending: true, _csvType: "expense",
      desc: "Sparen·Tagesgeld", _seriesId: "s", splits: [] },
    { id: "s3", accountId: "acc-giro", date: "2026-10-01", totalAmount: -1200, pending: true, _csvType: "expense", splits: [] },
  ];
  const ctx = () => buildCtx({ txs, giroAnchorPrevMonth: 2200 });

  it("Stichtag am Monatsletzten: Gehalt und Sparrate sind eingerechnet", () => {
    // 2200 (Anker Aug) + 2500 Gehalt − 584 Sparrate
    expect(computeTagessaldoAt("2026-09-30", "acc-giro", ctx(), today)).toBe(4116);
  });

  it("Rückbuchungstag im FOLGEmonat: Belastung am Ersten ist erfasst", () => {
    // Anker (Sep-Ende) − 1200 Miete. Der Mock liefert als Anker konstant 2200,
    // entscheidend ist hier, dass die Oktober-Buchung überhaupt greift.
    expect(computeTagessaldoAt("2026-10-01", "acc-giro", ctx(), today)).toBe(1000);
  });

  it("stimmt am Monatsletzten mit dem saldoEnde aus computeMinTagessaldo überein", () => {
    const viaMin = computeMinTagessaldo(2026, 8, {}, "acc-giro", null, ctx(), today).saldoEnde;
    const viaTag = computeTagessaldoAt("2026-09-30", "acc-giro", ctx(), today);
    expect(viaTag).toBe(viaMin);
  });

  it("gibt bei unbrauchbarem Datum null zurück", () => {
    expect(computeTagessaldoAt("kaputt", "acc-giro", ctx(), today)).toBeNull();
  });
});
