// Der Zinsertrag der Mega-Sparrate — normale Rate gegen Mega-Sparrate.
//
// Nutzer-Wunsch: „Durch die Mega-Sparrate möchte ich ja den Zinsertrag
// maximieren. Es wäre toll, wenn Du für die Zinsmonate anhand des
// Tagesgeldsaldo am Monatsletzten die Zinsen anzeigen könntest —
// gegenübergestellt normale Sparrate <> Mega-Sparrate. Der Zinssatz soll über
// ein Eingabefeld anpassbar sein."
//
// Der wichtigste Test in dieser Datei ist der letzte: Er hält fest, dass
// BEIDE Zinsmodelle gerechnet werden. Die Mega-Sparrate funktioniert nur,
// wenn die Bank den Stand am Stichtag verzinst. Rechnet sie taggenau — bei
// Tagesgeld das verbreitete Modell —, bringt dasselbe Manöver statt eines
// Quartals nur ein bis drei Tage. Eine App, die nur die erste Zahl zeigt,
// verspricht Geld, das es vielleicht gar nicht gibt.

import { describe, it, expect } from "vitest";
import { parseZinssatz, tageZwischen, vorigerZinsTermin, zinsFuerZeitraum,
  zinsVergleich, ZINSTAGE_JAHR } from "../src/utils/zinsErtrag.js";

describe("Zinssatz-Eingabe", () => {
  it("nimmt das deutsche Komma", () => {
    expect(parseZinssatz("2,25")).toBe(2.25);
    expect(parseZinssatz("2.25")).toBe(2.25);
    expect(parseZinssatz(" 2,25 % ")).toBe(2.25);
    expect(parseZinssatz("3")).toBe(3);
  });

  it("leer bleibt leer — nicht 0", () => {
    // 0 % hieße „ich habe nachgesehen, es gibt keine Zinsen"; leer heißt „ich
    // habe noch nichts eingetragen". Das eine zeigt 0,00 € an, das andere gar
    // nichts.
    expect(parseZinssatz("")).toBeNull();
    expect(parseZinssatz(null)).toBeNull();
    expect(parseZinssatz("Quatsch")).toBeNull();
    expect(parseZinssatz("-1")).toBeNull();
  });
});

describe("Zeitraum eines Zinstermins", () => {
  it("zählt die Tage zwischen zwei Daten", () => {
    expect(tageZwischen("2026-09-30", "2026-10-01")).toBe(1);
    expect(tageZwischen("2026-06-30", "2026-09-30")).toBe(92);
    // Über den Jahreswechsel und über den 29. Februar hinweg.
    expect(tageZwischen("2027-12-31", "2028-03-31")).toBe(91);
  });

  it("findet den vorigen Zinstermin", () => {
    expect(vorigerZinsTermin("2026-09-30", [2, 5, 8, 11])).toBe("2026-06-30");
    // Über den Jahreswechsel zurück.
    expect(vorigerZinsTermin("2026-03-31", [2, 5, 8, 11])).toBe("2025-12-31");
  });

  it("bei nur einem Zinsmonat verzinst der Termin ein ganzes Jahr", () => {
    expect(vorigerZinsTermin("2026-12-31", [11])).toBe("2025-12-31");
    expect(tageZwischen("2025-12-31", "2026-12-31")).toBe(365);
  });

  it("ohne Zinsmonate gibt es keinen vorigen Termin", () => {
    expect(vorigerZinsTermin("2026-09-30", [])).toBeNull();
  });
});

describe("Zinsbetrag", () => {
  it("rechnet act/365 und rundet auf Cent", () => {
    // 10.000 € zu 2 % für 92 Tage = 10000 * 0,02 * 92/365 = 50,41 €
    expect(zinsFuerZeitraum(10000, 2, 92)).toBe(50.41);
    expect(ZINSTAGE_JAHR).toBe(365);
  });

  it("kein Betrag, kein Zins", () => {
    expect(zinsFuerZeitraum(0, 2, 92)).toBe(0);
    expect(zinsFuerZeitraum(10000, 0, 92)).toBe(0);
    expect(zinsFuerZeitraum(10000, 2, 0)).toBe(0);
    // Ein negativer Stand verzinst sich hier nicht — Sollzinsen sind eine
    // andere Frage und gehören nicht in eine Sparplan-Vorschau.
    expect(zinsFuerZeitraum(-500, 2, 92)).toBe(0);
  });
});

describe("Gegenüberstellung normale Rate ↔ Mega-Sparrate", () => {
  // Dirks Größenordnung aus dem Bildschirm: gut 20.000 € auf dem Tagesgeld,
  // die Mega-Sparrate legt 2.450 € für zwei Tage drauf, 2 % p.a., Quartal.
  const fall = { saldoNormal: 20000, extra: 2450, prozent: 2,
    tageZeitraum: 92, tageFenster: 2 };

  it("zeigt beide Zinsbeträge und die Differenz", () => {
    const v = zinsVergleich(fall);
    expect(v.normal).toBe(100.82);      // 20000 * 0,02 * 92/365
    expect(v.mitMega).toBe(113.17);     // 22450 * 0,02 * 92/365
    expect(v.plus).toBe(12.35);
  });

  it("die Differenz ist genau der Zins auf den Sweep-Betrag", () => {
    const v = zinsVergleich(fall);
    // Sonst rechnete die Anzeige etwas anderes als das, was sie behauptet.
    expect(v.plus).toBeCloseTo(zinsFuerZeitraum(fall.extra, fall.prozent, fall.tageZeitraum), 2);
  });

  it("UND den Wert unter dem taggenauen Modell", () => {
    // DER Punkt: Verzinst die Bank taggenau, sind aus 12,35 € noch 27 Cent
    // uebrig. Wer 2.450 € fuer 27 Cent hin- und herschiebt, sollte das
    // wenigstens wissen. Beide Zahlen kommen deshalb aus DERSELBEN Rechnung
    // — eine davon wegzulassen waere die eigentliche Falschaussage.
    const v = zinsVergleich(fall);
    expect(v.taggenauPlus).toBe(0.27);  // 2450 * 0,02 * 2/365
    expect(v.taggenauPlus).toBeLessThan(v.plus);
  });

  it("ohne Zinssatz gibt es keine Aussage", () => {
    expect(zinsVergleich({ ...fall, prozent: 0 })).toBeNull();
    expect(zinsVergleich({ ...fall, tageZeitraum: 0 })).toBeNull();
  });

  it("ohne Mega-Sparrate sind beide Zinsbeträge gleich", () => {
    const v = zinsVergleich({ ...fall, extra: 0 });
    expect(v.mitMega).toBe(v.normal);
    expect(v.plus).toBe(0);
    expect(v.taggenauPlus).toBe(0);
  });
});
