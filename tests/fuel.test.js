import { describe, it, expect } from "vitest";
import { isFuelCat, isFuelSelection, hasFuelData, calcConsumption, buildFuelSeries } from "../src/utils/fuel.js";

describe("isFuelCat", () => {
  it("erkennt 'Tanken' exakt, case-insensitive, getrimmt", () => {
    expect(isFuelCat({name:"Tanken"})).toBe(true);
    expect(isFuelCat({name:"tanken"})).toBe(true);
    expect(isFuelCat({name:" TANKEN "})).toBe(true);
  });
  it("lehnt andere Kategorien und leere/fehlende Werte ab", () => {
    expect(isFuelCat({name:"Auto"})).toBe(false);
    expect(isFuelCat({name:"Tankstelle"})).toBe(false);
    expect(isFuelCat(null)).toBe(false);
    expect(isFuelCat(undefined)).toBe(false);
    expect(isFuelCat({})).toBe(false);
  });
});

// Regression: "Tanken" wird in der Praxis oft als UNTERkategorie einer
// Hauptkategorie "Auto" angelegt (Auto/Tanken), nicht als eigene
// Hauptkategorie. isFuelCat allein prüft nur die Hauptkategorie — damit
// blieben die Tank-Zusatzfelder bei so einer Struktur unsichtbar.
describe("isFuelSelection", () => {
  it("erkennt 'Tanken' als Hauptkategorie", () => {
    expect(isFuelSelection({name:"Tanken"}, undefined)).toBe(true);
  });
  it("erkennt 'Tanken' als Unterkategorie einer anderen Hauptkategorie (z.B. Auto/Tanken)", () => {
    expect(isFuelSelection({name:"Auto"}, {name:"Tanken"})).toBe(true);
  });
  it("lehnt ab, wenn weder Haupt- noch Unterkategorie 'Tanken' heißt", () => {
    expect(isFuelSelection({name:"Auto"}, {name:"Waschen & Pflege"})).toBe(false);
    expect(isFuelSelection({name:"Auto"}, undefined)).toBe(false);
    expect(isFuelSelection(null, null)).toBe(false);
  });
});

describe("hasFuelData", () => {
  it("erkennt vorhandene Tank-Zusatzfelder", () => {
    expect(hasFuelData({_fuelLiters:40})).toBe(true);
    expect(hasFuelData({_odometer:12000})).toBe(true);
    expect(hasFuelData({_fuelLiters:0})).toBe(true); // 0 ist ein gültiger Wert, kein "fehlt"
    expect(hasFuelData({})).toBe(false);
    expect(hasFuelData(null)).toBe(false);
  });
});

describe("calcConsumption", () => {
  it("berechnet l/100km aus Distanz und Menge des späteren Tankvorgangs", () => {
    expect(calcConsumption(10000, 10500, 35)).toBeCloseTo(7, 5); // 35l / 500km * 100
  });
  it("liefert null bei fehlenden Werten oder ungültiger Distanz/Menge", () => {
    expect(calcConsumption(null, 10500, 35)).toBeNull();
    expect(calcConsumption(10000, null, 35)).toBeNull();
    expect(calcConsumption(10000, 10500, null)).toBeNull();
    expect(calcConsumption(10500, 10000, 35)).toBeNull(); // Distanz <= 0 (km-Stand rückwärts)
    expect(calcConsumption(10000, 10000, 35)).toBeNull(); // keine Distanz
    expect(calcConsumption(10000, 10500, 0)).toBeNull();  // keine Menge
  });
});

describe("buildFuelSeries", () => {
  const vId = "v1";
  const txs = [
    {id:"t3", date:"2026-03-01", _fuelVehicleId:vId, _odometer:11000, _fuelLiters:40},
    {id:"t1", date:"2026-01-01", _fuelVehicleId:vId, _odometer:10000, _fuelLiters:35},
    {id:"t2", date:"2026-02-01", _fuelVehicleId:vId, _odometer:10500, _fuelLiters:38},
    {id:"other", date:"2026-01-15", _fuelVehicleId:"v2", _odometer:5000, _fuelLiters:20},
    {id:"noOdo", date:"2026-01-20", _fuelVehicleId:vId, _fuelLiters:10}, // ohne km-Stand → ausgeschlossen
  ];

  it("filtert auf das Fahrzeug, sortiert nach km-Stand und berechnet Verbrauch zwischen Nachbarn", () => {
    const series = buildFuelSeries(txs, vId);
    expect(series.map(t=>t.id)).toEqual(["t1","t2","t3"]);
    expect(series[0]._consumption).toBeNull(); // kein Vorgänger
    expect(series[1]._consumption).toBeCloseTo((38/500)*100, 5);
    expect(series[2]._consumption).toBeCloseTo((40/500)*100, 5);
  });

  it("liefert eine leere Liste für ein unbekanntes Fahrzeug", () => {
    expect(buildFuelSeries(txs, "unbekannt")).toEqual([]);
  });
});
