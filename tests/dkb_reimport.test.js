import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { parseCSV } from "../src/utils/csv.js";
import { txFingerprint, txFingerprintNorm, normalizeDesc } from "../src/utils/tx.js";

// Formatübergreifende Duplikatserkennung an ENTPERSONALISIERTEN Fixtures (im
// Repo, daher laufen die Tests überall — kein Zugriff auf private Dateien nötig).
// Beide Dateien sind derselbe DKB-Tagesgeld-Kontoauszug mit Fantasie-Name/IBAN:
//   • dkb_tagesgeld.csv    – DKB-Original, 99 Buchungen (2024–2026)
//   • finanzblick_2024.csv – Finanzblick-Export desselben Kontos, nur 2024
// Szenario: Wer die 2024er Buchungen schon über Finanzblick importiert hat und
// danach den DKB-Original-Export einliest, darf die 2024er NICHT doppelt anlegen.
const F = p => readFileSync(`tests/fixtures/${p}`, "utf-8");
const accId = "acc-tagesgeld";

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

describe("Formatübergreifende Duplikatserkennung (DKB ↔ Finanzblick)", () => {
  it("erkennt DKB-Original und liest den Header-Saldo", () => {
    const { rows, format, detectedBalances } = parseCSV(F("dkb_tagesgeld.csv"));
    expect(format).toBe("DKB");
    expect(rows.length).toBe(99);
    expect(detectedBalances.some(a => a.date === "2026-05-21" && Math.abs(a.saldo - 8905) < 0.001)).toBe(true);
  });

  it("erkennt die 2024-Überlappung als Duplikate, neuere Buchungen als neu", () => {
    const fb  = parseCSV(F("finanzblick_2024.csv"));
    const dkb = parseCSV(F("dkb_tagesgeld.csv"));
    const known = knownFps(fb.rows);
    const resolved = resolve(dkb.rows);
    const dup = resolved.filter(isDup(known));
    const neu = resolved.filter(r => !isDup(known)(r));

    // Finanzblick deckt nur 2024 ab → 35 der 39 DKB-2024-Buchungen werden als
    // Dup erkannt (die übrigen 4 sind DKB-Zins-/Abrechnungszeilen, die
    // Finanzblick anders formatiert). 2025/2026 ist korrekt "neu".
    expect(dup.length).toBe(35);
    // Alle erkannten Duplikate liegen in 2024:
    expect(dup.every(r => r.isoDate >= "2024-01-01" && r.isoDate <= "2024-12-31")).toBe(true);
    // Eine klar außerhalb 2024 liegende Buchung darf NICHT als Dup gelten:
    expect(neu.some(r => r.isoDate === "2026-05-04")).toBe(true);
  });

  it("wiederholter Finanzblick-Import erkennt alle bestehenden Buchungen als Dup", () => {
    const fb = parseCSV(F("finanzblick_2024.csv"));
    const known = knownFps(fb.rows);
    const reNew = resolve(fb.rows).filter(r => !isDup(known)(r));
    expect(reNew.length).toBe(0);
  });

  it("normalizeDesc räumt Umlaute und DATUM-Suffix weg", () => {
    expect(normalizeDesc("Rücküberweisung")).toBe("rueckueberweisung");
    expect(normalizeDesc("Rueckueberweisung  DATUM 14.02.2024, 10.36 UHR")).toBe("rueckueberweisung");
    expect(normalizeDesc("Maße & Größen")).toBe("masse & groessen");
    expect(normalizeDesc("  doppelte   spaces  ")).toBe("doppelte spaces");
  });
});
