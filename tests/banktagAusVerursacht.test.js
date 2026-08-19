// Der Banktag folgt dem Verursachungsdatum (utils/date.js: bankTagAb).
//
// Anlass: Im Vormerken-Dialog standen „verursacht" und „Banktag" unverbunden
// nebeneinander. Ein Kauf vom 27.11. konnte einen Banktag vom 20.08. behalten
// — eine Belastung VOR dem Kauf (Nutzer-Bild).
//
// Die Regel: Kauftag + Verzögerungstage des Kontos, dann auf einen Banktag
// rücken. Der Unterschied zu `nextBankWorkday` ist der Kern: das rückt IMMER
// mindestens einen Tag weiter, hier soll ein Kauf am Dienstag aber am Dienstag
// belastet werden können.

import { describe, it, expect } from "vitest";
import { bankTagAb, nextBankWorkday, isBankWorkday } from "../src/utils/date.js";

const wochentag = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
};

describe("Banktag aus Verursachungsdatum", () => {
  it("ohne Verzögerung bleibt ein Banktag stehen", () => {
    // 2026-08-20 ist ein Donnerstag.
    expect(wochentag("2026-08-20")).toBe(4);
    expect(bankTagAb("2026-08-20", 0)).toBe("2026-08-20");
    // Genau hier unterscheidet es sich von nextBankWorkday:
    expect(nextBankWorkday("2026-08-20")).toBe("2026-08-21");
  });

  it("ein Wochenende rückt auf den Montag", () => {
    // 2026-08-22 ist ein Samstag, 23. Sonntag.
    expect(wochentag("2026-08-22")).toBe(6);
    expect(bankTagAb("2026-08-22", 0)).toBe("2026-08-24");
    expect(bankTagAb("2026-08-23", 0)).toBe("2026-08-24");
    expect(wochentag("2026-08-24")).toBe(1);
  });

  it("Verzögerungstage des Kontos zählen mit", () => {
    // Donnerstag + 2 Tage = Samstag → Montag.
    expect(bankTagAb("2026-08-20", 2)).toBe("2026-08-24");
    // Donnerstag + 1 Tag = Freitag, das ist ein Banktag.
    expect(bankTagAb("2026-08-20", 1)).toBe("2026-08-21");
  });

  it("TARGET2-Feiertage werden übersprungen, regionale nicht", () => {
    // 1. Mai 2026 ist ein Freitag und TARGET2-Feiertag → Montag, 4. Mai.
    expect(bankTagAb("2026-05-01", 0)).toBe("2026-05-04");
    // Fronleichnam (2026: 4. Juni, Donnerstag) ist KEIN TARGET2-Feiertag.
    expect(bankTagAb("2026-06-04", 0)).toBe("2026-06-04");
  });

  it("das Ergebnis ist immer ein Banktag und nie vor dem Kauftag", () => {
    // Ein ganzes Jahr durchgehen — der eigentliche Anspruch, nicht Einzelfälle.
    for (let tag = 0; tag < 365; tag++) {
      const d = new Date(2026, 0, 1 + tag);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      for (const verzug of [0, 1, 3]) {
        const raus = bankTagAb(iso, verzug);
        const [y, m, dd] = raus.split("-").map(Number);
        expect(isBankWorkday(new Date(y, m - 1, dd)), `${iso}+${verzug} → ${raus}`).toBe(true);
        expect(raus >= iso, `${iso}+${verzug} → ${raus} liegt davor`).toBe(true);
      }
    }
  });

  it("ohne Datum passiert nichts", () => {
    expect(bankTagAb("", 3)).toBe("");
    expect(bankTagAb(null, 3)).toBeNull();
    expect(bankTagAb(undefined, 3)).toBeUndefined();
  });
});
