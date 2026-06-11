import { describe, it, expect } from "vitest";
import { isoAddMonths, parseGermanDate } from "../src/utils/date.js";
import { parseGermanAmount, parseCSV } from "../src/utils/csv.js";
import { txFingerprint } from "../src/utils/tx.js";

describe("isoAddMonths", () => {
  it("addiert Monate korrekt mit Jahres-Übergang", () => {
    expect(isoAddMonths("2026-01-15", 1)).toBe("2026-02-15");
    expect(isoAddMonths("2026-12-31", 1)).toBe("2027-01-31");
    expect(isoAddMonths("2026-03-15", -1)).toBe("2026-02-15");
  });
});

describe("parseGermanDate", () => {
  it("parst DD.MM.YYYY zu ISO", () => {
    expect(parseGermanDate("15.05.2026")).toBe("2026-05-15");
    expect(parseGermanDate("01.01.2026")).toBe("2026-01-01");
  });
});

describe("parseGermanAmount", () => {
  it("parst deutsche Beträge", () => {
    expect(parseGermanAmount("1.234,56")).toBe(1234.56);
    expect(parseGermanAmount("-12,50")).toBe(-12.5);
    expect(parseGermanAmount("0,01")).toBe(0.01);
  });
  it("erkennt nachgestelltes Minus als negativ (DE/SAP-Format)", () => {
    expect(parseGermanAmount("47,30-")).toBe(-47.30);
    expect(parseGermanAmount("1.234,56-")).toBe(-1234.56);
    expect(parseGermanAmount("47,30- EUR")).toBe(-47.30);
    expect(parseGermanAmount("47,30-€")).toBe(-47.30);
  });
  it("erkennt Klammer-Negative und positive Beträge weiterhin korrekt", () => {
    expect(parseGermanAmount("(47,30)")).toBe(-47.30);
    expect(parseGermanAmount("100,00 EUR")).toBe(100);
    expect(parseGermanAmount("+50,00")).toBe(50);
    expect(parseGermanAmount("1.234,56")).toBe(1234.56); // kein falsches Minus
  });
});

describe("parseCSV", () => {
  it("parst einfache CSV-Zeilen", () => {
    const csv = "Datum;Buchungstext;Betrag\n01.05.2026;Edeka;-12,34\n02.05.2026;Lohn;1500,00";
    const result = parseCSV(csv);
    expect(result).toHaveProperty("rows");
    expect(result).toHaveProperty("format");
    expect(Array.isArray(result.rows)).toBe(true);
  });

  it("importiert auch CSVs mit ISO-Datum (vorher: 0 Buchungen, still verworfen)", () => {
    const iso = "Datum;Buchungstext;Betrag\n2026-05-01;Edeka;-12,34\n2026-05-02;Lohn;1500,00";
    const de  = "Datum;Buchungstext;Betrag\n01.05.2026;Edeka;-12,34\n02.05.2026;Lohn;1500,00";
    expect(parseCSV(iso).rows.length).toBe(parseCSV(de).rows.length);
    expect(parseCSV(iso).rows.length).toBeGreaterThan(0);
  });

  it("liefert leeres rows-Array bei zu kurzer Eingabe", () => {
    const result = parseCSV("nur eine Zeile");
    expect(result.rows).toEqual([]);
  });
});

describe("txFingerprint", () => {
  it("erzeugt identische Fingerprints für gleiche (date, amount, desc)", () => {
    expect(txFingerprint("2026-05-01", -12.34, "Edeka"))
      .toBe(txFingerprint("2026-05-01", -12.34, "Edeka"));
  });
  it("unterscheidet bei anderem Datum", () => {
    expect(txFingerprint("2026-05-01", -12.34, "Edeka"))
      .not.toBe(txFingerprint("2026-05-02", -12.34, "Edeka"));
  });
  it("unterscheidet bei anderem Betrag", () => {
    expect(txFingerprint("2026-05-01", -12.34, "Edeka"))
      .not.toBe(txFingerprint("2026-05-01", -12.35, "Edeka"));
  });
});

describe("parseCSV — übersprungene Problem-Zeilen melden", () => {
  it("meldet unlesbaren Betrag (Müll), NICHT legitime 0,00 / Leerzeilen", () => {
    const csv = [
      "Datum;Buchungstext;Betrag",
      "01.05.2026;Edeka;-12,34",      // ok
      "02.05.2026;Nullbuchung;0,00",  // legitime Null → still überspringen
      "03.05.2026;Kaputt;n/a",        // Müll im Betrag → melden
    ].join("\n");
    const { rows, skipped } = parseCSV(csv);
    expect(rows.length).toBe(1);
    expect(skipped.length).toBe(1);
    expect(skipped[0].reason).toBe("Betrag");
    expect(skipped[0].rawAmount).toBe("n/a");
  });
  it("meldet unlesbares Datum", () => {
    const csv = [
      "Datum;Buchungstext;Betrag",
      "01.05.2026;Ok;-5,00",
      "Quatschdatum;Defekt;-9,99",
    ].join("\n");
    const { skipped } = parseCSV(csv);
    expect(skipped.some(s=>s.reason==="Datum")).toBe(true);
  });
});
