// Die Automatik, die die Sparrate des laufenden Monats nachführt.
//
// Anlass für diese Datei ist ein Absturz beim Nutzer:
//
//   CRASH: ReferenceError: reineTxs is not defined
//
// Beim Ausbau der Mega-Sparrate fiel die Hilfsvariable `reineTxs` weg — eine
// Zeile benutzte sie weiter. Alle 904 Tests blieben grün, und trotzdem stürzte
// die App beim Start ab, sobald echte Daten da waren.
//
// Der Grund ist nicht Pech, sondern die Bauform: Die Entscheidung stand als
// `useMemo` mitten in App.jsx und lief nur dann, wenn im Bestand GENAU EINE
// Sparplan-Rate für den laufenden Monat steht. Der Boot-Test rendert die App
// mit leeren Daten — er kommt an dieser Bedingung gar nicht vorbei.
//
// Jetzt ist es eine reine Funktion, und dieser Test geht genau durch die Tür,
// hinter der es geknallt hat.

import { describe, it, expect } from "vitest";
import { sparAnpassungFuerMonat, sparRateSetzen } from "../src/utils/sparAutomatik.js";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const wurzel = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const HEUTE = new Date(2026, 7, 22);           // 22.08.2026
const pad = (n) => String(n).padStart(2, "0");
const AM = `2026-${pad(8)}-31`;

const abgang = (extra = {}) => ({
  id: "a1", accountId: "acc-giro", date: AM, pending: true, _csvType: "expense",
  desc: "Sparen·Sparplan 1", _seriesId: "s1", totalAmount: -100,
  splits: [{ id: "s-a1", catId: "c", subId: "", amount: -100 }], ...extra,
});
const zugang = (extra = {}) => ({
  id: "z1", accountId: "acc-tg", date: AM, pending: true, _csvType: "income",
  desc: "Sparen·Sparplan 1", _seriesId: "s1-tgt", _linkedTo: "a1", totalAmount: 100,
  splits: [{ id: "s-z1", catId: "c", subId: "", amount: 100 }], ...extra,
});

describe("Sparrate des laufenden Monats nachführen", () => {
  it("findet die Rate und meldet den neuen Betrag — beide Beine", () => {
    // GENAU der Weg, auf dem die App abgestürzt ist.
    const txs = [abgang(), zugang()];
    const optimum = new Map([["a1", 648]]);
    const a = sparAnpassungFuerMonat({ txs, sparOptimum: optimum, today: HEUTE });
    expect(a).toMatchObject({ abgangId: "a1", zugangId: "z1",
      oldAmount: 100, safeAmount: 648, y: 2026, m: 7 });
  });

  it("stimmt der Betrag schon, passiert nichts", () => {
    // Nicht bloß Sparsamkeit: Die Automatik läuft auf Änderungen von `txs` und
    // ändert `txs` selbst. Ohne ein belastbares „passt schon" schriebe sie
    // sich endlos im Kreis.
    const txs = [abgang(), zugang()];
    expect(sparAnpassungFuerMonat({ txs, sparOptimum: new Map([["a1", 100]]), today: HEUTE }))
      .toBeNull();
  });

  it("ohne gerechnetes Optimum bleibt die Rate unangetastet", () => {
    // Die Rechnung läuft verzögert im Leerlauf. Bis sie da ist, wäre jede
    // Änderung geraten.
    const txs = [abgang(), zugang()];
    expect(sparAnpassungFuerMonat({ txs, sparOptimum: new Map(), today: HEUTE })).toBeNull();
  });

  it("bei ZWEI Plänen im Monat greift die Automatik nicht", () => {
    // Dann wäre nicht zu erkennen, welche Rate gemeint ist.
    const txs = [abgang(), abgang({ id: "a2", desc: "Sparen·Urlaub", _seriesId: "s2" })];
    expect(sparAnpassungFuerMonat({ txs, sparOptimum: new Map([["a1", 648]]), today: HEUTE }))
      .toBeNull();
  });

  it("fremde Buchungen des Monats zählen nicht als Rate", () => {
    const txs = [
      abgang(),
      { id: "x", accountId: "acc-giro", date: AM, pending: true, desc: "Miete", splits: [] },
      { ...abgang({ id: "alt", date: "2026-07-31" }) },        // Vormonat
      { ...abgang({ id: "gebucht", pending: false }) },        // schon gebucht
    ];
    const a = sparAnpassungFuerMonat({ txs, sparOptimum: new Map([["a1", 648]]), today: HEUTE });
    expect(a.abgangId).toBe("a1");
  });

  it("eine Rate ohne Gegenstück geht auch", () => {
    // Ohne zugeordnetes Tagesgeldkonto gibt es nur das eine Bein.
    const a = sparAnpassungFuerMonat({ txs: [abgang()],
      sparOptimum: new Map([["a1", 648]]), today: HEUTE });
    expect(a.zugangId).toBeNull();
  });

  it("das Setzen zieht die Splits mit", () => {
    // Der Betrag steht doppelt in einer Buchung: als Summe und in den Splits.
    // Bleibt einer davon stehen, stimmen Saldo und Kategorie-Auswertung nicht
    // mehr überein.
    const neu = sparRateSetzen([abgang(), zugang()],
      { abgangId: "a1", zugangId: "z1", safeAmount: 648 });
    expect(neu[0].totalAmount).toBe(-648);
    expect(neu[0].splits[0].amount).toBe(-648);
    expect(neu[1].totalAmount, "der Zugang trägt dasselbe mit anderem Vorzeichen").toBe(648);
    expect(neu[1].splits[0].amount).toBe(648);
    // Alles andere bleibt unangetastet.
    expect(neu[0].date).toBe(AM);
    expect(neu[0].splits[0].catId).toBe("c");
  });
});

describe("App.jsx benutzt die geprüfte Funktion", () => {
  const app = readFileSync(resolve(wurzel, "src/App.jsx"), "utf8");

  it("die Entscheidung steht nicht mehr im Bauteil", () => {
    expect(app).toMatch(/sparAnpassungFuerMonat\(\{ txs, sparOptimum \}\)/);
    expect(app).toMatch(/setTxs\(prev => sparRateSetzen\(prev, currentMonthSparAdjust\)\)/);
  });

  it("von der Mega-Sparrate ist in App.jsx nichts mehr übrig", () => {
    // Der Absturz kam aus genau diesem Ausbau. Ein Rest, der noch auf eine
    // gelöschte Bindung zeigt, wäre derselbe Fehler noch einmal.
    const wirksam = app.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    expect(wirksam).not.toMatch(/reineTxs/);
    expect(wirksam).not.toMatch(/ohneSweepBuchungen/);
    expect(wirksam).not.toMatch(/computeSweep|sweepFenster|sweepZustandAnwenden/);
    expect(wirksam).not.toMatch(/strainDurchSweep/);
    expect(wirksam).not.toMatch(/_sweepId|_sweepHin/);
  });
});
