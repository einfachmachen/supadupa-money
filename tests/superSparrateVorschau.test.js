// Die Super-Sparrate gehört SICHTBAR in den Sparplan.
//
// Nutzer-Wunsch: „Es macht wenig Sinn, dass ich nur die normale und nicht die
// Super-Sparraten in den Zinsmonaten vorher sehe, sondern erst, wenn ein
// Zinsmonat läuft. Die Super-Sparrate möchte ich auch im Sparplan sehen."
//
// Bis hierher wurde der Sweep nur für den LAUFENDEN Monat gerechnet — in
// App.jsx hinter `zinsMonate.includes(today.getMonth())`, im SweepBanner
// hinter `istZinstermin`. Ein technisches Hindernis war das nie; es fragte nur
// niemand für andere Monate. Eine Vorschau, die für einen Zinsmonat die
// normale Rate zeigt, obwohl dort ein Vielfaches fließt, ist aber keine.
//
// `sweepFuerMonat` rechnet für jeden Monat. Wichtig dabei — und deshalb der
// letzte Test hier: Sie RECHNET nur. Buchungen entstehen weiterhin erst zum
// Termin; der Plan darf die Zahl zeigen, ohne das Geld vorzeitig zu bewegen.

import { describe, it, expect } from "vitest";
import { sweepFuerMonat, monatsLetzter, sweepFenster } from "../src/utils/zinsSweep.js";
import { computeTagessaldoAt } from "../src/utils/sparBerechnen.js";

const ausgabe = (id, datum, b) => ({ id, accountId: "acc-giro", date: datum,
  totalAmount: -b, pending: true, _csvType: "expense", splits: [] });
const einnahme = (id, datum, b) => ({ id, accountId: "acc-giro", date: datum,
  totalAmount: b, pending: true, _csvType: "income", splits: [] });

function buildCtx(txs, anker) {
  return { txs, cats: [], accounts: [{ id: "acc-giro", name: "Giro" }],
    getKumulierterSaldo: (y, m) => (y === 2026 && m === 6 ? anker : null),
    getCat: () => null, getBudgetForMonth: () => 0 };
}
const saldoAmTag = (d, c, vs) => computeTagessaldoAt(d, "acc-giro", c, undefined, vs);
const ZINS = [2, 5, 8, 11];          // Quartalsenden (Mär, Jun, Sep, Dez)
const today = new Date("2026-08-20");

describe("Super-Sparrate für beliebige Monate", () => {
  it("rechnet für einen KÜNFTIGEN Zinsmonat, nicht nur den laufenden", () => {
    // September 2026 ist Zinsmonat, „heute" ist der 20. August.
    const txs = [einnahme("gehalt-09", "2026-09-01", 3000)];
    const ctx = buildCtx(txs, 4000);
    const s = sweepFuerMonat({ y: 2026, m: 8, ctx, puffer: 100, normaleSparrate: 0,
      monate: ZINS, today, saldoAmTag });
    expect(s, "September ist Zinsmonat — es muss ein Ergebnis geben").toBeTruthy();
    expect(s.termin).toBe(monatsLetzter(2026, 8));
    expect(s.hin).toBeGreaterThan(0);
    expect(s.zurueck).toBeGreaterThan(0);
    expect(s.bis).toBe(sweepFenster(s.termin).bis);
  });

  it("Nicht-Zinsmonate liefern nichts", () => {
    const ctx = buildCtx([einnahme("g", "2026-10-01", 3000)], 4000);
    // Oktober (9) steht nicht in der Liste.
    expect(sweepFuerMonat({ y: 2026, m: 9, ctx, puffer: 100, monate: ZINS, today, saldoAmTag }))
      .toBeNull();
  });

  it("die normale Rate steckt im Hin-Betrag und NICHT im Rückweg", () => {
    // Das ist die Zusage der Formel: regelmäßig sparen UND die maximalen
    // Zinsen mitnehmen. `hin = Überhang + normale Rate`, `zurueck = Überhang`
    // — die Rate bleibt also liegen, nur der Überhang kommt zurück.
    //
    // (Die Tagessalden enthalten die Rate in der App bereits; hier wird sie
    // separat übergeben, deshalb steigt `hin` um genau diesen Betrag.)
    const txs = [einnahme("gehalt", "2026-09-01", 3000)];
    const ctx = buildCtx(txs, 4000);
    const ohne = sweepFuerMonat({ y: 2026, m: 8, ctx, puffer: 100, normaleSparrate: 0,
      monate: ZINS, today, saldoAmTag });
    const mit = sweepFuerMonat({ y: 2026, m: 8, ctx, puffer: 100, normaleSparrate: 300,
      monate: ZINS, today, saldoAmTag });
    expect(mit.hin).toBe(ohne.hin + 300);       // 300 gehen zusätzlich mit raus …
    expect(mit.zurueck).toBe(ohne.zurueck);     // … und kommen NICHT zurück
    expect(mit.bleibt).toBe(300);
    expect(mit.hin - mit.zurueck).toBe(300);
  });

  it("geplante, noch nicht gebuchte Raten zählen mit (virtualSpar)", () => {
    // Die Sparplan-Vorschau legt noch keine Buchungen an. Ohne diesen
    // Durchgriff sähe die Rechnung einen Saldo, in dem die geplanten Raten
    // gar nicht abgezogen sind — und käme auf einen viel zu hohen Betrag.
    const txs = [einnahme("gehalt", "2026-09-01", 3000)];
    const ctx = buildCtx(txs, 4000);
    const ohne = sweepFuerMonat({ y: 2026, m: 8, ctx, puffer: 100, monate: ZINS, today, saldoAmTag });
    const mit = sweepFuerMonat({ y: 2026, m: 8, ctx, puffer: 100, monate: ZINS, today, saldoAmTag,
      virtualSpar: { "2026-08-31": -1000 } });
    expect(mit.hin, "1000 schon verplant → 1000 weniger Spielraum").toBeLessThan(ohne.hin);
  });

  it("rechnet nur — der Buchungsbestand bleibt unberührt", () => {
    const txs = [einnahme("gehalt", "2026-09-01", 3000), ausgabe("miete", "2026-10-02", 900)];
    const vorher = JSON.stringify(txs);
    const ctx = buildCtx(txs, 4000);
    sweepFuerMonat({ y: 2026, m: 8, ctx, puffer: 100, monate: ZINS, today, saldoAmTag });
    expect(JSON.stringify(txs), "die Vorschau darf kein Geld bewegen").toBe(vorher);
  });

  it("die Belastungen am Monatsanfang begrenzen den Betrag", () => {
    // Der Sinn des Rückholfensters: Das Geld ist nur kurz weg, muss aber für
    // die Miete am 1./2. wieder da sein. Eine hohe Belastung dort drückt den
    // Sweep — genau das unterscheidet ihn von der dauerhaften Sparrate.
    const wenig = buildCtx([einnahme("g", "2026-09-01", 3000), ausgabe("m", "2026-10-01", 200)], 4000);
    const viel  = buildCtx([einnahme("g", "2026-09-01", 3000), ausgabe("m", "2026-10-01", 2500)], 4000);
    const a = sweepFuerMonat({ y: 2026, m: 8, ctx: wenig, puffer: 100, monate: ZINS, today, saldoAmTag });
    const b = sweepFuerMonat({ y: 2026, m: 8, ctx: viel,  puffer: 100, monate: ZINS, today, saldoAmTag });
    expect(b ? b.hin : 0).toBeLessThan(a.hin);
  });
});
