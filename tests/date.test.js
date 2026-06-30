import { describe, it, expect } from "vitest";
import { nextBankWorkday, isBankWorkday, parseGermanDate, isoAddDays, pendingDebitDate } from "../src/utils/date.js";

describe("isoAddDays", () => {
  it("addiert Kalendertage", () => {
    expect(isoAddDays("2026-06-22", 30)).toBe("2026-07-22");
    expect(isoAddDays("2026-01-15", 30)).toBe("2026-02-14");
  });
  it("rechnet über Monats- und Jahresgrenzen", () => {
    expect(isoAddDays("2026-12-20", 30)).toBe("2027-01-19");
    expect(isoAddDays("2024-02-28", 1)).toBe("2024-02-29"); // Schaltjahr
  });
});

describe("parseGermanDate", () => {
  it("parst deutsches Format", () => {
    expect(parseGermanDate("10.06.2026")).toBe("2026-06-10");
    expect(parseGermanDate("10.6.26")).toBe("2026-06-10");
    expect(parseGermanDate(" 01.05.2026 ")).toBe("2026-05-01");
  });
  it("parst ISO-Format (manche Bank-Exporte)", () => {
    expect(parseGermanDate("2026-06-10")).toBe("2026-06-10");
    expect(parseGermanDate("2026-6-1")).toBe("2026-06-01");
    expect(parseGermanDate("2026/06/10")).toBe("2026-06-10");
  });
  it("liefert null bei unbekanntem Format", () => {
    expect(parseGermanDate("")).toBe(null);
    expect(parseGermanDate("Quatsch")).toBe(null);
    expect(parseGermanDate("06/10/2026")).toBe(null); // US-Format bewusst nicht (mehrdeutig)
  });
});

describe("nextBankWorkday — TARGET2-Banktage", () => {
  it("normaler Werktag → Folgetag", () => {
    // Di 9.6.2026 → Mi 10.6.2026
    expect(nextBankWorkday("2026-06-09")).toBe("2026-06-10");
  });

  it("Freitag → Montag (Wochenende übersprungen)", () => {
    // Fr 12.6.2026 → Mo 15.6.2026
    expect(nextBankWorkday("2026-06-12")).toBe("2026-06-15");
  });

  it("vor Karfreitag → Dienstag nach Ostern (Karfr + WE + Ostermontag)", () => {
    // Do 2.4.2026 → Karfr 3.4., Sa 4., So 5. (Ostersonntag), Ostermo 6. → Di 7.4.
    expect(nextBankWorkday("2026-04-02")).toBe("2026-04-07");
  });

  it("vor 1. Mai → Montag (1.5. Feiertag + WE)", () => {
    // Do 30.4.2026 → Fr 1.5. (Feiertag), Sa 2., So 3. → Mo 4.5.
    expect(nextBankWorkday("2026-04-30")).toBe("2026-05-04");
  });

  it("Heiligabend → 1. Werktag nach Weihnachten", () => {
    // Do 24.12.2026 → Fr 25. (Feiertag), Sa 26. (Feiertag), So 27. → Mo 28.12.
    expect(nextBankWorkday("2026-12-24")).toBe("2026-12-28");
  });

  it("Silvester → Neujahr übersprungen", () => {
    // Do 31.12.2026 → Fr 1.1.2027 (Neujahr), Sa 2., So 3. → Mo 4.1.2027
    expect(nextBankWorkday("2026-12-31")).toBe("2027-01-04");
  });

  it("isBankWorkday: Wochenende und Feiertage sind keine Banktage", () => {
    expect(isBankWorkday(new Date(2026,5,13))).toBe(false); // Sa 13.6.
    expect(isBankWorkday(new Date(2026,5,14))).toBe(false); // So 14.6.
    expect(isBankWorkday(new Date(2026,4,1))).toBe(false);  // 1. Mai
    expect(isBankWorkday(new Date(2026,3,3))).toBe(false);  // Karfreitag 3.4.2026
    expect(isBankWorkday(new Date(2026,5,15))).toBe(true);  // Mo 15.6.
  });
});

describe("pendingDebitDate — Vormerkung frühestens am nächsten Banktag", () => {
  it("heute (Di 30.6.) verursacht → Belastung Mi 1.7.", () => {
    expect(pendingDebitDate("2026-06-30", "2026-06-30")).toBe("2026-07-01");
  });
  it("Freitag → nächster Banktag ist Montag", () => {
    expect(pendingDebitDate("2026-06-12", "2026-06-12")).toBe("2026-06-15"); // Fr→Mo
  });
  it("bereits in der Zukunft datierte Vormerkung bleibt unverändert", () => {
    expect(pendingDebitDate("2026-07-15", "2026-06-30")).toBe("2026-07-15");
  });
  it("vergangenes Datum (noch offen) wird auf den Banktag danach gesetzt", () => {
    expect(pendingDebitDate("2026-06-29", "2026-06-30")).toBe("2026-06-30"); // Mo 29.6.→Di 30.6.
  });
  it("leeres Datum bleibt leer", () => {
    expect(pendingDebitDate("", "2026-06-30")).toBe("");
  });
});
