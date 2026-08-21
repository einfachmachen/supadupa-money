// Die Spalte „nach Sparen" muss ein Tagessaldo sein, den es wirklich gibt.
//
// Gemeldeter Widerspruch (Nutzer-Bild, Sparplan-Tabelle für Aug 26):
//
//     Tiefst-Saldo*   nach Sparen   + Monat
//         +203,92      −379,57 ⚠      +583
//
// „Wie kann es richtig sein, wenn ich nach der Sparrate von 583 € ins Minus
// rutsche? Wann tritt dieser Tagessaldo ein und wieso führt er nicht zu einer
// Schieflage?"
//
// Antwort: Der Tagessaldo trat nie ein. Die Spalte rechnete
// `Monats-Tiefstand − volle Rate` — sie unterstellte also, die Rate sei den
// ganzen Monat über schon abgegangen. Tatsächlich geht sie erst am
// MONATSLETZTEN ab; am tiefen Tag mitten im Monat liegt das Geld noch da.
// Deshalb gab es weder das Minus noch eine Schieflage.
//
// Gemessen wird jetzt dort, wo die Rate wirklich wirkt: vom Ratentermin bis
// zur nächsten Rate. In diesem Fenster ist sie an JEDEM Tag abgezogen — und
// dort muss der Puffer stehen bleiben, sonst hätte die Rate zu hoch gelegen.

import { describe, it, expect } from "vitest";
import { sparPlanOptimum, tiefpunktImFenster, computeMinTagessaldo,
  buildTxsByMonth } from "../src/utils/sparBerechnen.js";
import { buildTxIdMap } from "../src/utils/tx.js";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const wurzel = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pad = (n) => String(n).padStart(2, "0");
const today = new Date("2026-08-20");
const puffer = 100;
const MONATE = 6;
const SPAR_DESC = "Sparen·Tagesgeld";
const letzter = (y, m) => `${y}-${pad(m + 1)}-${pad(new Date(y, m + 1, 0).getDate())}`;
const jm = (i) => { const idx = 7 + i; return [2026 + Math.floor(idx / 12), idx % 12]; };

// Der Fall aus dem Bild in klein: eine tiefe Delle MITTEN im Monat (Ausgabe am
// 25., Gehalt erst am 28.) — genau dort lag der Monats-Tiefstand.
function planTxs() {
  const out = [];
  for (let i = 0; i < MONATE; i++) {
    const [y, m] = jm(i);
    out.push({ id: `vorschau-${i}`, accountId: "acc-giro", date: letzter(y, m),
      totalAmount: 0, pending: true, _csvType: "expense", desc: SPAR_DESC,
      _seriesId: "vorschau-serie",
      splits: [{ id: `vs${i}`, catId: "", subId: "", amount: 0 }] });
    out.push({ id: `inc-${i}`, accountId: "acc-giro", date: `${y}-${pad(m + 1)}-28`,
      totalAmount: 2500, pending: true, _csvType: "income", splits: [] });
    out.push({ id: `aus-${i}`, accountId: "acc-giro", date: `${y}-${pad(m + 1)}-25`,
      totalAmount: -2000, pending: true, _csvType: "expense", splits: [] });
  }
  return out;
}
const mkCtx = (txs) => ({ txs, cats: [], accounts: [{ id: "acc-giro", name: "Giro" }],
  getKumulierterSaldo: (y, m) => (y === 2026 && m === 6 ? 2200 : null),
  getCat: () => null, getBudgetForMonth: () => 0 });

// Genau der Ablauf aus berechnen(): erst optimieren, dann die Raten mit ihrem
// gerechneten Betrag einsetzen und darauf die Tiefpunkte messen.
function tabelle() {
  const txs = planTxs();
  const opt = sparPlanOptimum({ txs, puffer, ctx: mkCtx(txs), today, abDatumIso: "2026-08-01" });
  const ergebnisTxs = txs.map((t) => {
    if (!String(t.id).startsWith("vorschau-")) return t;
    const b = opt.get(t.id) ?? 0;
    return { ...t, totalAmount: -b, splits: t.splits.map((s) => ({ ...s, amount: -b })) };
  });
  const ctx = { ...mkCtx(ergebnisTxs), _restCache: {},
    _txsById: buildTxIdMap(ergebnisTxs), _txsByMonth: buildTxsByMonth(ergebnisTxs) };
  return Array.from({ length: MONATE }, (_, i) => {
    const [y, m] = jm(i);
    const [ny, nm] = jm(i + 1);
    const tp = tiefpunktImFenster(letzter(y, m), letzter(ny, nm), "acc-giro", ctx, today, 2);
    const rate = Math.round(opt.get(`vorschau-${i}`) ?? 0);
    return { rate, minNach: tp.min, tag: tp.tag, minVor: tp.min === null ? null : tp.min + rate };
  });
}

describe("Sparplan-Tabelle: die Spalte „nach Sparen\"", () => {
  const rows = tabelle();

  it("bleibt nie unter dem Puffer — sonst wäre die Rate zu hoch", () => {
    rows.forEach((r, i) => {
      expect(r.minNach, `Monat ${i}: nur ${r.minNach}`).toBeGreaterThanOrEqual(puffer);
    });
  });

  it("nennt den Tag, an dem der Tiefpunkt eintritt", () => {
    rows.forEach((r) => expect(r.tag).toMatch(/^\d{4}-\d{2}-\d{2}$/));
  });

  it("der Tiefpunkt liegt im Fenster der Rate, nicht davor", () => {
    rows.forEach((r, i) => {
      const [y, m] = jm(i), [ny, nm] = jm(i + 1);
      expect(r.tag >= letzter(y, m)).toBe(true);
      expect(r.tag < letzter(ny, nm)).toBe(true);
    });
  });

  it("die beiden Spalten unterscheiden sich um genau die Rate", () => {
    // Im Fenster ist die Rate an JEDEM Tag abgezogen — deshalb ist der Stand
    // davor exakt „nach + Rate". Genau diese Zusage macht die Tabelle lesbar.
    rows.forEach((r) => expect(r.minVor - r.minNach).toBe(r.rate));
  });

  it("die alte Rechnung hätte hier ein Minus behauptet, das es nicht gibt", () => {
    // Der gemeldete Fall, nachgestellt: Monats-Tiefstand minus volle Rate.
    const txs = planTxs();
    const { min: monatsMin } = computeMinTagessaldo(2026, 7, {}, "acc-giro", SPAR_DESC,
      mkCtx(txs), today);
    const alteSpalte = monatsMin - rows[0].rate;
    expect(alteSpalte, "so entstand die −379,57").toBeLessThan(0);
    expect(rows[0].minNach, "in Wirklichkeit steht der Puffer").toBeGreaterThanOrEqual(puffer);
  });

  it("das Widget rechnet die Spalte im Fenster — nicht mehr als Differenz", () => {
    const src = readFileSync(resolve(wurzel, "src/components/organisms/TagesgeldWidget.jsx"), "utf8");
    expect(src).toMatch(/tiefpunktImFenster\(vonIso, bisIso, "acc-giro", fensterCtx/);
    // Die alte Zeile darf nicht zurueckkommen.
    expect(src, "keine Differenz-Rechnung mehr")
      .not.toMatch(/const minNachSparen = minTag!==null \? minTag - zusaetzlich : null/);
    // Und der gespeicherte Stand traegt die neue Regelnummer, sonst zeigte die
    // Tabelle nach dem Update weiter ihre alten Minusbetraege.
    expect(src).toMatch(/const VORSCHAU_REGEL = [4-9]\d*/);
  });
});
