import { describe, it, expect } from "vitest";
import { normSearch, matchSearch, matchAmount } from "../src/utils/search.js";

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
