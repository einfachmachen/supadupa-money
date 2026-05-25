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
});

describe("parseCSV", () => {
  it("parst einfache CSV-Zeilen", () => {
    const csv = "Datum;Buchungstext;Betrag\n01.05.2026;Edeka;-12,34\n02.05.2026;Lohn;1500,00";
    const result = parseCSV(csv);
    expect(result).toHaveProperty("rows");
    expect(result).toHaveProperty("format");
    expect(Array.isArray(result.rows)).toBe(true);
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
