import { describe, it, expect } from "vitest";
import { normSearch, matchSearch, matchAmount, getAllTags } from "../src/utils/search.js";

describe("normSearch", () => {
  it("normalisiert Bindestriche und lowercase", () => {
    expect(normSearch("HALLO")).toBe("hallo");
    expect(normSearch("ein–test")).toBe("ein-test");  // en-dash → minus
    expect(normSearch("ein—test")).toBe("ein-test");  // em-dash → minus
  });
  it("toleriert null/undefined", () => {
    expect(normSearch(null)).toBe("");
    expect(normSearch(undefined)).toBe("");
  });
});

describe("matchSearch", () => {
  it("matcht Substring case-insensitive", () => {
    expect(matchSearch("Edeka Markt", "edeka")).toBe(true);
    expect(matchSearch("Edeka Markt", "EDEKA")).toBe(true);
    expect(matchSearch("Edeka", "rewe")).toBe(false);
  });
  it("leere Suche matcht alles", () => {
    expect(matchSearch("irgendwas", "")).toBe(true);
  });
});

describe("matchSearch mit Tags (#-Suche)", () => {
  it("ein #-Suchwort matcht gegen die Tags, nicht gegen den Freitext", () => {
    expect(matchSearch("Maquinas Vending", "#aida", ["aida"])).toBe(true);
    expect(matchSearch("Maquinas Vending", "#aida", ["amazon"])).toBe(false);
    // "aida" steht zufällig NICHT im Text — Ausschluss beweist, dass wirklich
    // gegen tags geprüft wird, nicht gegen den (gar nicht enthaltenen) Text.
    expect(matchSearch("Maquinas Vending", "#aida", [])).toBe(false);
  });
  it("Teilstring-Match auf Tags (wie beim Freitext)", () => {
    expect(matchSearch("x", "#ama", ["amazon"])).toBe(true);
  });
  it("bloßes '#' verlangt irgendein Tag", () => {
    expect(matchSearch("x", "#", ["amazon"])).toBe(true);
    expect(matchSearch("x", "#", [])).toBe(false);
  });
  it("kombiniert Freitext- und Tag-Suchwörter (UND-Verknüpfung)", () => {
    expect(matchSearch("Kreuzfahrt Bordkonto", "bordkonto #aida", ["aida"])).toBe(true);
    expect(matchSearch("Kreuzfahrt Bordkonto", "bordkonto #aida", ["amazon"])).toBe(false);
  });
  it("ohne tags-Argument verhält sich #-Suche wie vorher (kein Crash, matcht nie)", () => {
    expect(matchSearch("irgendwas", "#aida")).toBe(false);
  });
});

describe("getAllTags", () => {
  it("sammelt alle Tags dedupliziert und alphabetisch sortiert", () => {
    const txs = [
      { id: "t1", tags: ["aida", "amazon"] },
      { id: "t2", tags: ["amazon"] },
      { id: "t3", tags: [] },
      { id: "t4" },
    ];
    expect(getAllTags(txs)).toEqual(["aida", "amazon"]);
  });
  it("toleriert null/undefined", () => {
    expect(getAllTags(null)).toEqual([]);
    expect(getAllTags(undefined)).toEqual([]);
  });
});

describe("matchAmount", () => {
  it("matcht Betrag-Präfix (Original-Verhalten)", () => {
    expect(matchAmount(12.34, "12,34")).toBe(true);
    expect(matchAmount(12.34, "12.34")).toBe(true);
    // Negativ-Beträge matchen NICHT mit positivem Suchstring
    // (Original: toFixed(2) → "-12.34", startsWith "12,34" → false)
    expect(matchAmount(-12.34, "12,34")).toBe(false);
  });
  it("Operator-Suche", () => {
    expect(matchAmount(50, ">=50")).toBe(true);
    expect(matchAmount(50, ">50")).toBe(false);
    expect(matchAmount(50, "<100")).toBe(true);
  });
  it("Nicht-Zahl-Suche liefert false", () => {
    expect(matchAmount(99, "abc")).toBe(false);
  });
});
