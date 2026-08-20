// Was sagt die App bei einem Liquiditäts-Engpass über sich selbst?
//
// Die Sparraten-Automatik greift im Hintergrund ein. Solange sie reichte, sah
// man gar keine Warnung; reichte sie nicht mehr, stand plötzlich eine
// Warnung da — ohne ein Wort dazu, ob die App etwas dagegen tut. Genau das
// war der Nutzer-Befund: „Jetzt wird mir plötzlich ein Liquiditäts-Engpass
// angezeigt und ich sehe keine Info, ob/was ggf. geändert wird. Bin gerade
// lost."
//
// `sparHilfeFuerEngpass` beantwortet das für einen konkreten Engpass-Tag. Die
// drei Fälle, die es zu unterscheiden gilt, stehen hier je einzeln — sie
// führen in der Oberfläche zu drei verschiedenen Sätzen.

import { describe, it, expect } from "vitest";
import { sparHilfeFuerEngpass } from "../src/utils/sparBerechnen.js";

function buildCtx({ txs, anker }) {
  return {
    txs,
    cats: [],
    accounts: [{ id: "acc-giro", name: "Giro" }],
    // Anker nur für Juli 2026 — danach schreibt die App den Saldo selbst fort.
    getKumulierterSaldo: (y, m) => (y === 2026 && m === 6 ? anker : null),
    getCat: () => null,
    getBudgetForMonth: () => 0,
  };
}
const rate = (id, datum, betrag) => ({
  id, accountId: "acc-giro", date: datum, totalAmount: -betrag, pending: true,
  _csvType: "expense", desc: "Sparen·Tagesgeld", _seriesId: "s1",
  splits: [{ id: id + "-s", catId: "", subId: "", amount: -betrag }],
});
const ausgabe = (id, datum, betrag) => ({
  id, accountId: "acc-giro", date: datum, totalAmount: -betrag, pending: true,
  _csvType: "expense", splits: [],
});

const today = new Date("2026-08-20");
const puffer = 100;

describe("sparHilfeFuerEngpass", () => {
  it("die zuständige Rate kann es auffangen: reduzieren, und es reicht", () => {
    const txs = [
      rate("r-08", "2026-08-28", 500),
      rate("r-09", "2026-09-28", 500),
      // 2000 − 500 (Aug) − 500 (Sep) = 1000, dann −1200 → −200: unter Puffer.
      // Ohne die September-Rate blieben 300 übrig, sie darf also noch 200.
      ausgabe("delle", "2026-10-05", 1200),
    ];
    const ctx = buildCtx({ txs, anker: 2000 });
    const h = sparHilfeFuerEngpass({ txs, engpassIso: "2026-10-05", puffer, ctx, today });
    expect(h, "eine Rate vor dem Engpass gibt es").toBeTruthy();
    // Zuständig ist die September-Rate (28.09.) — die letzte VOR dem 5.10.
    expect(h.monat).toBe(8);
    expect(h.jahr).toBe(2026);
    expect(h.wirdReduziert).toBe(true);
    expect(h.reicht).toBe(true);
    expect(h.sicher).toBeLessThan(h.aktuell);
  });

  it("die Rate steht schon bei 0: die App kann nichts mehr tun", () => {
    // Genau der Fall, in dem die Warnung sonst kommentarlos dasteht.
    const txs = [
      rate("r-09", "2026-09-28", 0),
      ausgabe("gross", "2026-10-05", 3000),
    ];
    const ctx = buildCtx({ txs, anker: 2000 });
    const h = sparHilfeFuerEngpass({ txs, engpassIso: "2026-10-05", puffer, ctx, today });
    expect(h.aktuell).toBe(0);
    expect(h.wirdReduziert, "es gibt nichts mehr zu senken").toBe(false);
    expect(h.reicht, "und es reicht auch nicht").toBe(false);
  });

  it("reduzieren hilft, aber nicht genug: beides muss gesagt werden", () => {
    const txs = [
      rate("r-09", "2026-09-28", 300),
      ausgabe("gross", "2026-10-05", 2500),
    ];
    const ctx = buildCtx({ txs, anker: 2000 });
    const h = sparHilfeFuerEngpass({ txs, engpassIso: "2026-10-05", puffer, ctx, today });
    expect(h.sicher).toBe(0);
    expect(h.wirdReduziert).toBe(true);
    expect(h.reicht).toBe(false);
  });

  it("keine Rate vor dem Engpass: null statt einer falschen Aussage", () => {
    const txs = [
      rate("r-11", "2026-11-28", 500),
      ausgabe("delle", "2026-10-05", 3000),
    ];
    const ctx = buildCtx({ txs, anker: 2000 });
    expect(sparHilfeFuerEngpass({ txs, engpassIso: "2026-10-05", puffer, ctx, today })).toBeNull();
  });
});
