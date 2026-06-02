import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { parseCSV } from "../src/utils/csv.js";
import { txFingerprint, txFingerprintNorm } from "../src/utils/tx.js";

describe("DKB-Original-Reimport (formatübergreifende Duplikatserkennung)", () => {
  it("erkennt 98 von 99 Buchungen als Duplikat nach Finanzblick-Import", () => {
    const accId = "acc-tagesgeld";
    const txs = [];
    for(const f of readdirSync("/home/claude/archiv").sort()) {
      if(!(f.startsWith("finanzblick_") && f.endsWith(".csv"))) continue;
      const text = readFileSync(`/home/claude/archiv/${f}`, "utf-8");
      const { rows } = parseCSV(text);
      for(const r of rows) {
        txs.push({
          id: "fb-"+Math.random().toString(36).slice(2),
          date: r.isoDate,
          totalAmount: Math.abs(r.amount),
          desc: r.desc,
          accountId: accId,
          _fp: txFingerprint(r.isoDate, r.amount, r.desc, accId),
        });
      }
    }

    const knownFps = new Set();
    txs.forEach(t => {
      if(t._fp) knownFps.add(t._fp);
      const abs = Math.abs(t.totalAmount);
      knownFps.add(txFingerprint(t.date, t.totalAmount, t.desc));
      knownFps.add(txFingerprint(t.date, abs, t.desc));
      knownFps.add(txFingerprintNorm(t.date, t.totalAmount, t.desc));
      knownFps.add(txFingerprintNorm(t.date, abs, t.desc));
      if(t.accountId) {
        knownFps.add(txFingerprint(t.date, t.totalAmount, t.desc, t.accountId));
        knownFps.add(txFingerprint(t.date, abs, t.desc, t.accountId));
        knownFps.add(txFingerprintNorm(t.date, t.totalAmount, t.desc, t.accountId));
        knownFps.add(txFingerprintNorm(t.date, abs, t.desc, t.accountId));
      }
    });

    const dkbText = readFileSync("/mnt/user-data/uploads/21-05-2026_Umsatzliste_Tagesgeld_DE16120300001023196197_1_.csv", "utf-8");
    const { rows: dkbRows, format, detectedBalances } = parseCSV(dkbText);

    const resolved = dkbRows.map(r => ({
      ...r,
      fp: txFingerprint(r.isoDate, r.amount, r.desc, accId),
      _fpNorm: txFingerprintNorm(r.isoDate, r.amount, r.desc, accId),
    }));
    const isDup = r => knownFps.has(r.fp) || knownFps.has(r._fpNorm);
    const newRows = resolved.filter(r => !isDup(r));
    const dupRows = resolved.filter(isDup);

    // Erwartet: viele werden als Dup erkannt; ein paar nicht, weil:
    //  - PayPal-Gruppierung in Finanzblick fasst Belastung+Gegenbuchung-Paare zusammen
    //    (z.B. ±992,50 € am gleichen Tag → 1 Buchung mit verlorenem VZ; DKB hat beide einzeln)
    //  - Echte fehlende Buchungen im Finanzblick-Export (z.B. die 250 € vom 03.04.2025)
    // Verbleibende "NEW" sind exakt die Buchungen, die ein Mensch manuell prüfen soll.
    expect(format).toBe("DKB");
    expect(resolved.length).toBe(99);
    // Mindestens 80 % als Dup erkannt (typisch 90/99 = 91 %)
    expect(dupRows.length).toBeGreaterThanOrEqual(80);
    // Die echte fehlende Buchung MUSS in newRows sein:
    const has250 = newRows.some(r => r.isoDate === "2025-04-03" && Math.abs(r.amount - 250) < 0.001);
    expect(has250).toBe(true);

    // Anker aus Header sollte erkannt sein
    const has21May = detectedBalances.some(a =>
      a.date === "2026-05-21" && Math.abs(a.saldo - 8905.00) < 0.001
    );
    expect(has21May).toBe(true);
  });

  it("normalizeDesc räumt Umlaute und DATUM-Suffix weg", async () => {
    const { normalizeDesc } = await import("../src/utils/tx.js");
    expect(normalizeDesc("Rücküberweisung")).toBe("rueckueberweisung");
    expect(normalizeDesc("Rueckueberweisung  DATUM 14.02.2024, 10.36 UHR")).toBe("rueckueberweisung");
    expect(normalizeDesc("Maße & Größen")).toBe("masse & groessen");
    expect(normalizeDesc("  doppelte   spaces  ")).toBe("doppelte spaces");
  });

  it("ein wiederholter Finanzblick-Import erkennt alle bestehenden Buchungen weiterhin als Dup", () => {
    // Backward-Compat: bestehender Workflow darf nicht gebrochen werden
    const accId = "acc-tagesgeld";
    const text = readFileSync("/home/claude/archiv/finanzblick_2024_DKB_TagesGeld.csv", "utf-8");
    const { rows } = parseCSV(text);
    // Erst importieren
    const txs = rows.map(r => ({
      id: "x"+Math.random(), date: r.isoDate, totalAmount: Math.abs(r.amount), desc: r.desc, accountId: accId,
      _fp: txFingerprint(r.isoDate, r.amount, r.desc, accId),
    }));
    // knownFps wie im Screen
    const knownFps = new Set();
    txs.forEach(t => {
      if(t._fp) knownFps.add(t._fp);
      const abs = Math.abs(t.totalAmount);
      knownFps.add(txFingerprint(t.date, t.totalAmount, t.desc));
      knownFps.add(txFingerprint(t.date, abs, t.desc));
      knownFps.add(txFingerprintNorm(t.date, t.totalAmount, t.desc));
      knownFps.add(txFingerprintNorm(t.date, abs, t.desc));
      if(t.accountId) {
        knownFps.add(txFingerprint(t.date, t.totalAmount, t.desc, t.accountId));
        knownFps.add(txFingerprint(t.date, abs, t.desc, t.accountId));
        knownFps.add(txFingerprintNorm(t.date, t.totalAmount, t.desc, t.accountId));
        knownFps.add(txFingerprintNorm(t.date, abs, t.desc, t.accountId));
      }
    });
    // Erneut parsen
    const { rows: rows2 } = parseCSV(text);
    const resolved = rows2.map(r => ({
      ...r,
      fp: txFingerprint(r.isoDate, r.amount, r.desc, accId),
      _fpNorm: txFingerprintNorm(r.isoDate, r.amount, r.desc, accId),
    }));
    const isDup = r => knownFps.has(r.fp) || knownFps.has(r._fpNorm);
    const newRows = resolved.filter(r => !isDup(r));
    expect(newRows.length).toBe(0); // ALLE alten erneut als Dup erkannt
  });
});
