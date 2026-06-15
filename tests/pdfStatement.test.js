import { describe, it, expect } from "vitest";
import { parseWirecardLines } from "../src/utils/pdfStatement.js";
import { txFingerprint } from "../src/utils/tx.js";

// Zeilen wie sie die PDF-Extraktion (pdf.js) für einen Wirecard/N26-Auszug liefert.
const sample = [
  "Donnerstag, 19. November 2015  0,00 €",
  "100,00 €",
  "Cash26",
  "Cash26",
  "-100,00 €",
  "Dirk Trowe",
  "IBAN: DE06120300001005520455 · BIC: BYLADEM1001",
  "Bareinzahlung auf Number26 zu DKB ueberwiesen",
  "Freitag, 26. Februar 2016  1.967,62 €",
  "1.902,12 €",
  "FRIGOSPED GMBH",
  "IBAN: DE33200300000050100222 · BIC: HYVEDEMM300",
  "Lohn--Gehaltzahlung 2-2016",
  "-11,07 €",
  "Globus SB-Warenhaus",
  "MAESTRO · Lebensmittel",
];

describe("parseWirecardLines", () => {
  const { rows, format, detectedBalances } = parseWirecardLines(sample);

  it("erkennt das Format", () => {
    expect(format).toBe("Wirecard/N26-PDF");
  });

  it("parst alle Buchungen mit Datum, Vorzeichen und Beschreibung", () => {
    expect(rows).toHaveLength(4);

    expect(rows[0]).toMatchObject({ isoDate: "2015-11-19", amount: 100, desc: "Cash26" });
    expect(rows[1]).toMatchObject({
      isoDate: "2015-11-19", amount: -100,
      desc: "Dirk Trowe · Bareinzahlung auf Number26 zu DKB ueberwiesen",
    });
    expect(rows[2]).toMatchObject({
      isoDate: "2016-02-26", amount: 1902.12,
      desc: "FRIGOSPED GMBH · Lohn--Gehaltzahlung 2-2016",
    });
    expect(rows[3]).toMatchObject({
      isoDate: "2016-02-26", amount: -11.07,
      desc: "Globus SB-Warenhaus · MAESTRO · Lebensmittel",
    });
  });

  it("dedupliziert doppelte Namenszeilen (Cash26 · Cash26 → Cash26)", () => {
    expect(rows[0].desc).toBe("Cash26");
  });

  it("ignoriert die IBAN-Zeile in der Beschreibung", () => {
    expect(rows[1].desc).not.toMatch(/IBAN/);
  });

  it("setzt einen kompatiblen Fingerprint", () => {
    expect(rows[0].fp).toBe(txFingerprint("2015-11-19", 100, "Cash26"));
  });

  it("nimmt den letzten Tagessaldo als Anker", () => {
    expect(detectedBalances).toEqual([{ date: "2016-02-26", saldo: 1967.62 }]);
  });

  it("schneidet den Schluss-/AGB-Block ab", () => {
    const withFooter = [
      "Montag, 5. Dezember 2016  0,00 €",
      "-30,00 €",
      "DIRK TROWE",
      "Entgueltige Kontoraeumung von N26",
      "Zusammenfassung 18. November 2015 - 12. Januar 2017",
      "Dein alter Kontostand 0,00",
      "Unsere Allgemeinen Geschäftsbedingungen ...",
      "Dein N26 Team",
    ];
    const r = parseWirecardLines(withFooter).rows;
    expect(r).toHaveLength(1);
    expect(r[0].desc).toBe("DIRK TROWE · Entgueltige Kontoraeumung von N26");
  });
});
