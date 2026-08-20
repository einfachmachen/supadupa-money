// EINE Quelle für die Sparraten — Vorschau und Automatik dürfen nicht
// auseinanderlaufen.
//
// Der gemeldete Widerspruch (Nutzer-Bilder): Der Sparplan zeigte für August
// 103 € an, in den Buchungen standen 583 €. Zwei Stellen rechneten dieselben
// Raten nach verschiedenen Regeln:
//
//   Vorschau (`berechnen()` im TagesgeldWidget)
//       obere Schranke = Tiefst-Saldo des GANZEN Monats − Puffer,
//       dann Binärsuche mit drei Monaten Vorausschau.
//   Automatik (`sparPlanOptimum`)
//       Fenster ab dem Termin der Rate bis zur nächsten,
//       Suffix-Minimum über alle Fenster.
//
// Der Kern des Unterschieds — und der Grund, warum die Vorschau zu niedrig
// lag: Die Rate geht am MONATSLETZTEN ab. An einem tiefen Tag am 15. kann sie
// nichts mehr ändern. Sie mit diesem Tag zu begrenzen, verschenkt Sparbetrag,
// ohne einen Deut Sicherheit zu gewinnen.
//
// Dieser Test hält beides fest: dass die alte Schranke wirklich zu tief lag,
// und dass die Vorschau jetzt dieselbe Funktion benutzt wie die Automatik.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { sparPlanOptimum, computeMinTagessaldo } from "../src/utils/sparBerechnen.js";

const wurzel = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pad = (n) => String(n).padStart(2, "0");
const today = new Date("2026-08-20");
const puffer = 100;

// Der gemeldete Fall in klein: eine tiefe Delle MITTEN im Monat, danach das
// Gehalt. Die Rate am 31. kann an der Delle nichts ändern.
function szenario() {
  return [
    { id: "delle", accountId: "acc-giro", date: "2026-08-25", totalAmount: -2000,
      pending: true, _csvType: "expense", splits: [] },
    { id: "gehalt", accountId: "acc-giro", date: "2026-08-28", totalAmount: 2500,
      pending: true, _csvType: "income", splits: [] },
    // Die Rate des Plans — in der Vorschau eine Null-Rate am Monatsletzten.
    { id: "vorschau-0", accountId: "acc-giro", date: "2026-08-31", totalAmount: 0,
      pending: true, _csvType: "expense", desc: "Sparen·Tagesgeld",
      _seriesId: "vorschau-serie", splits: [{ id: "v0", catId: "", subId: "", amount: 0 }] },
  ];
}
const ctxFor = (txs) => ({ txs, cats: [], accounts: [{ id: "acc-giro", name: "Giro" }],
  getKumulierterSaldo: (y, m) => (y === 2026 && m === 6 ? 2200 : null),
  getCat: () => null, getBudgetForMonth: () => 0 });

describe("Sparraten: Vorschau und Automatik rechnen dasselbe", () => {
  it("belegt den gemeldeten Widerspruch: die alte Schranke lag zu tief", () => {
    const txs = szenario();
    const ctx = ctxFor(txs);

    // ALTE Vorschau-Regel: obere Schranke aus dem Tiefst-Saldo des Monats.
    const { min: monatsMin } = computeMinTagessaldo(2026, 7, {}, "acc-giro", "Sparen·Tagesgeld", ctx, today);
    const alteSchranke = Math.floor(Math.max(0, monatsMin - puffer));

    // NEUE Regel: das Fenster beginnt am Termin der Rate (31.08.).
    const neu = sparPlanOptimum({ txs, puffer, ctx, today, abDatumIso: "2026-08-01" })
      .get("vorschau-0") ?? 0;

    expect(monatsMin, "die Delle am 25. drueckt den Monats-Tiefstand").toBeLessThan(neu + puffer);
    expect(neu, "die Rate am 31. darf mehr als die alte Schranke").toBeGreaterThan(alteSchranke);
  });

  it("und die neue Rate haelt den Puffer trotzdem", () => {
    const txs = szenario();
    const ctx = ctxFor(txs);
    const neu = sparPlanOptimum({ txs, puffer, ctx, today, abDatumIso: "2026-08-01" })
      .get("vorschau-0") ?? 0;
    // Mit der Rate gebucht darf ab ihrem Termin kein Tag unter den Puffer.
    const mit = txs.map((t) => (t.id === "vorschau-0"
      ? { ...t, totalAmount: -neu, splits: [{ ...t.splits[0], amount: -neu }] } : t));
    const r = computeMinTagessaldo(2026, 7, {}, "acc-giro", null, ctxFor(mit), today);
    const am31 = r.saldoAt("2026-08-31");
    expect(am31, `am 31.08. blieben nur ${am31}`).toBeGreaterThanOrEqual(puffer);
  });

  it("die Vorschau benutzt sparPlanOptimum — keine zweite Naeherung mehr", () => {
    const src = readFileSync(resolve(wurzel, "src/components/organisms/TagesgeldWidget.jsx"), "utf8");
    expect(src, "die gemeinsame Funktion muss importiert sein")
      .toMatch(/sparPlanOptimum/);
    // Die alte Naeherung ist raus: keine eigene Binaersuche, keine
    // 3-Monats-Vorausschau, keine eigene obere Schranke.
    expect(src, "keine eigene Vorausschau mehr").not.toMatch(/LOOKAHEAD/);
    expect(src, "keine eigene obere Schranke mehr").not.toMatch(/maxMoeglich/);
  });

  it("die Vorschau legt keine Buchungen an", () => {
    // Die Null-Raten sind reine Rechenhilfen — sie dürfen den Bestand nicht
    // verändern (dieselbe Zusage wie bei der Super-Sparrate).
    const txs = szenario();
    const vorher = JSON.stringify(txs);
    sparPlanOptimum({ txs, puffer, ctx: ctxFor(txs), today, abDatumIso: "2026-08-01" });
    expect(JSON.stringify(txs)).toBe(vorher);
  });
});
