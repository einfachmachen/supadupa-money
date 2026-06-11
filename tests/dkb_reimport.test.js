import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { parseCSV } from "../src/utils/csv.js";
import { txFingerprint, txFingerprintNorm, normalizeDesc } from "../src/utils/tx.js";

// Formatübergreifende Duplikatserkennung an ENTPERSONALISIERTEN Fixtures (im
// Repo, daher laufen die Tests überall). Beide Dateien sind derselbe
// DKB-Tagesgeld-Kontoauszug mit Fantasie-Name/IBAN:
//   • dkb_tagesgeld.csv        – DKB-Original, 99 Buchungen (2024 – Mai 2026)
//   • finanzblick_tagesgeld.csv – Finanzblick-Exporte desselben Kontos,
//                                 2024 + 2025 + 2026 (Jan–Apr) zusammengeführt
// Szenario: Wer die Buchungen schon über Finanzblick importiert hat und danach
// den DKB-Original-Export einliest, darf nichts doppelt anlegen.
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

  it("erkennt 89 von 99 Buchungen als Duplikat; übrige sind nachvollziehbar neu", () => {
    const fb  = parseCSV(F("finanzblick_tagesgeld.csv"));
    const dkb = parseCSV(F("dkb_tagesgeld.csv"));
    const known = knownFps(fb.rows);
    const resolved = resolve(dkb.rows);
    const dup = resolved.filter(isDup(known));
    const neu = resolved.filter(r => !isDup(known)(r));

    // 89/99 als Dup erkannt. Die 10 verbleibenden "neu" sind:
    //  • die Mai-2026-Buchung (nach dem Finanzblick-Abdeckungszeitraum)
    //  • Belastung+Gegenbuchung-Paare, die Finanzblick zu EINER Buchung
    //    gruppiert (±992,50 / ±1305,90 / ±200 / ±1000) → DKB hat beide einzeln
    //  • eine echt im Finanzblick fehlende Buchung (250 € am 03.04.2025)
    expect(dup.length).toBe(89);
    expect(neu.length).toBe(10);

    // Die echt fehlende Buchung MUSS als "neu" auftauchen (manuelle Prüfung):
    expect(neu.some(r => r.isoDate === "2025-04-03" && Math.abs(r.amount - 250) < 0.001)).toBe(true);
    // Die Mai-Buchung (außerhalb der Finanzblick-Abdeckung) ebenfalls:
    expect(neu.some(r => r.isoDate === "2026-05-04")).toBe(true);
  });

  it("wiederholter Finanzblick-Import erkennt alle bestehenden Buchungen als Dup", () => {
    const fb = parseCSV(F("finanzblick_tagesgeld.csv"));
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
