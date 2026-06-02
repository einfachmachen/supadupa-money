import { describe, it, expect } from "vitest";
import { fmt, pn, uid, dayOf, drillSort } from "../src/utils/format.js";

describe("fmt", () => {
  it("formatiert Zahlen im deutschen Locale", () => {
    expect(fmt(1234.56)).toBe("1.234,56");
    expect(fmt("1234.56")).toBe("1.234,56");
    expect(fmt("1234,56")).toBe("1.234,56");
  });
  it("gibt absolute Werte zurück", () => {
    expect(fmt(-1234.5)).toBe("1.234,50");
  });
  it("gibt leeren String für leere Eingaben", () => {
    expect(fmt("")).toBe("");
    expect(fmt(null)).toBe("");
    expect(fmt(undefined)).toBe("");
  });
});

describe("pn (parse-number)", () => {
  it("parst Strings mit Komma und Punkt", () => {
    expect(pn("12,34")).toBe(12.34);
    expect(pn("12.34")).toBe(12.34);
  });
  it("rundet auf 2 Nachkommastellen", () => {
    expect(pn("1.236")).toBe(1.24);
  });
  it("liefert 0 für leere oder ungültige Eingaben", () => {
    expect(pn("")).toBe(0);
    expect(pn("abc")).toBe(0);
    expect(pn(null)).toBe(0);
  });
});

describe("uid", () => {
  it("erzeugt eindeutige IDs der Länge 8", () => {
    const a = uid(), b = uid();
    expect(a).toHaveLength(8);
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[a-z0-9]+$/);
  });
});

describe("dayOf", () => {
  it("extrahiert den Tag aus ISO-Datum", () => {
    expect(dayOf("2026-05-15")).toBe(15);
    expect(dayOf("2026-12-01")).toBe(1);
  });
});

describe("drillSort", () => {
  it("sortiert: Mitte-Budget (0) → Ende-Budget (1) → Rest (2 desc Datum)", () => {
    const arr = [
      { date: "2026-01-10", _budgetSubId: null },
      { date: "2026-01-20", _budgetSubId: "x_mitte" },
      { date: "2026-01-05", _budgetSubId: "x_ende" },
      { date: "2026-01-25", _budgetSubId: null },
    ];
    const sorted = [...arr].sort(drillSort);
    expect(sorted[0]._budgetSubId).toBe("x_mitte");
    expect(sorted[1]._budgetSubId).toBe("x_ende");
    expect(sorted[2].date).toBe("2026-01-25"); // neueres zuerst
    expect(sorted[3].date).toBe("2026-01-10");
  });
});
