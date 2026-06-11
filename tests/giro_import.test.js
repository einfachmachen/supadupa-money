import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { parseCSV } from "../src/utils/csv.js";
import { txFingerprint, txFingerprintNorm } from "../src/utils/tx.js";

// Frei erfundene Giro-Fixtures (kein echter Personenbezug) in DKB- und
// Finanzblick-Format. Decken eine zweite Format-Variante (Girokonto, VISA-
// Debitkartenumsätze) sowie das realistischste Szenario ab: erneuter Import
// desselben Kontoauszugs darf bereits vorhandene Buchungen NICHT doppeln.
const F = p => readFileSync(`tests/fixtures/${p}`, "utf-8");
const accId = "acc-giro";
const knownFps = (rows) => {
  const s = new Set();
  rows.forEach(r => {
    const abs = Math.abs(r.amount);
    for (const a of [r.amount, abs]) {
      s.add(txFingerprint(r.isoDate, a, r.desc));
      s.add(txFingerprintNorm(r.isoDate, a, r.desc));
      s.add(txFingerprint(r.isoDate, a, r.desc, accId));
      s.add(txFingerprintNorm(r.isoDate, a, r.desc, accId));
    }
  });
  return s;
};
const resolve = (rows) => rows.map(r => ({
  ...r,
  fp: txFingerprint(r.isoDate, r.amount, r.desc, accId),
  _fpNorm: txFingerprintNorm(r.isoDate, r.amount, r.desc, accId),
}));
const isDup = (known) => r => known.has(r.fp) || known.has(r._fpNorm);

describe("DKB-Giro-Format", () => {
  it("parst korrekt inkl. Header-Saldo und Vorzeichen", () => {
    const { rows, format, detectedBalances } = parseCSV(F("dkb_giro.csv"));
    expect(format).toBe("DKB");
    expect(rows.length).toBe(12);
    // Header-Saldo
    expect(detectedBalances.some(a => a.date === "2026-03-15" && Math.abs(a.saldo - 1234.56) < 0.001)).toBe(true);
    // Gehalt positiv, VISA-Ausgabe negativ
    const gehalt = rows.find(r => r.isoDate === "2026-03-01");
    expect(gehalt.amount).toBeGreaterThan(0);
    expect(rows.find(r => r.isoDate === "2026-03-02").amount).toBeLessThan(0);
  });
});

describe("Finanzblick-Giro-Format", () => {
  it("parst korrekt mit richtigen Vorzeichen", () => {
    const { rows, format } = parseCSV(F("finanzblick_giro.csv"));
    expect(format.startsWith("Finanzblick")).toBe(true);
    expect(rows.length).toBe(8);
    expect(rows.find(r => r.isoDate === "2026-03-01").amount).toBeGreaterThan(0); // Gehalt
    expect(rows.find(r => r.isoDate === "2026-03-10").amount).toBeLessThan(0);    // Miete
  });
});

describe("Erneuter Import desselben DKB-Giro-Auszugs (keine Doppel)", () => {
  it("erkennt bereits importierte Buchungen als Duplikat, nur neue sind neu", () => {
    const { rows } = parseCSV(F("dkb_giro.csv"));
    // 1. Import: nur Buchungen bis einschl. 10.03. (Stand eines früheren Exports)
    const ersterStand = rows.filter(r => r.isoDate <= "2026-03-10");
    const known = knownFps(ersterStand);
    // 2. Import: kompletter (neuerer) Auszug
    const resolved = resolve(rows);
    const neu = resolved.filter(r => !isDup(known)(r));
    const dup = resolved.filter(isDup(known));
    expect(ersterStand.length).toBe(7);
    expect(dup.length).toBe(7);   // die 7 bereits vorhandenen
    expect(neu.length).toBe(5);   // nur die 5 nach dem 10.03.
    expect(neu.every(r => r.isoDate > "2026-03-10")).toBe(true);
  });
});
