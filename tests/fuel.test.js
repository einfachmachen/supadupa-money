import { describe, it, expect } from "vitest";
import { isFuelCat, isFuelSelection, hasFuelData, calcDistance, calcConsumption, calcCostPerKm, checkOdometerPlausibility, buildFuelSeries } from "../src/utils/fuel.js";

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

describe("calcDistance", () => {
  it("berechnet die positive Distanz zwischen zwei km-Ständen", () => {
    expect(calcDistance(10000, 10500)).toBe(500);
  });
  it("liefert null bei fehlenden Werten oder rückwärtslaufendem/fehlendem km-Stand", () => {
    expect(calcDistance(null, 10500)).toBeNull();
    expect(calcDistance(10000, null)).toBeNull();
    expect(calcDistance(10500, 10000)).toBeNull();
    expect(calcDistance(10000, 10000)).toBeNull();
  });
});

describe("calcCostPerKm", () => {
  it("berechnet Kosten/km aus Menge × Preis/Liter des späteren Tankvorgangs / Distanz", () => {
    // 35l × 1,80€/l = 63€ für 500km → 0,126 €/km
    expect(calcCostPerKm(10000, 10500, 35, 1.8)).toBeCloseTo(0.126, 5);
  });
  it("liefert null bei fehlenden oder ungültigen Werten", () => {
    expect(calcCostPerKm(null, 10500, 35, 1.8)).toBeNull();
    expect(calcCostPerKm(10000, null, 35, 1.8)).toBeNull();
    expect(calcCostPerKm(10000, 10500, null, 1.8)).toBeNull();
    expect(calcCostPerKm(10000, 10500, 35, null)).toBeNull(); // kein Preis erfasst
    expect(calcCostPerKm(10500, 10000, 35, 1.8)).toBeNull();  // Distanz <= 0
    expect(calcCostPerKm(10000, 10500, 0, 1.8)).toBeNull();
    expect(calcCostPerKm(10000, 10500, 35, 0)).toBeNull();
  });
  it("entspricht Verbrauch(l/100km)/100 × Preis/Liter (konsistent mit calcConsumption)", () => {
    const cons = calcConsumption(10000, 10500, 35);
    const cost = calcCostPerKm(10000, 10500, 35, 1.8);
    expect(cost).toBeCloseTo((cons/100)*1.8, 5);
  });
});

describe("checkOdometerPlausibility", () => {
  const vId = "v1";
  const base = [
    {id:"a", date:"2026-05-01", _fuelVehicleId:vId, _odometer:134000},
    {id:"b", date:"2026-06-01", _fuelVehicleId:vId, _odometer:134700},
  ];

  it("liefert keine Warnung ohne vorhandene Historie", () => {
    expect(checkOdometerPlausibility([], vId, 13400, "2026-07-01")).toBeNull();
  });

  it("regression: fehlende Ziffer (13400 statt 134700) wird als 'lower' erkannt", () => {
    const w = checkOdometerPlausibility(base, vId, 13400, "2026-07-01");
    expect(w).not.toBeNull();
    expect(w.type).toBe("lower");
    expect(w.refOdometer).toBe(134700);
  });

  it("warnt NICHT beim nachträglichen Erfassen einer ÄLTEREN Tankbuchung mit kleinerem km-Stand", () => {
    // Neue Buchung VOR den bestehenden beiden, mit plausibel kleinerem km-Stand.
    const w = checkOdometerPlausibility(base, vId, 133500, "2026-04-01");
    expect(w).toBeNull();
  });

  it("erkennt einen km-Stand über einer bereits erfassten SPÄTEREN Buchung ('higher')", () => {
    // Buchung zwischen a und b, aber km-Stand höher als b (unmöglich).
    const w = checkOdometerPlausibility(base, vId, 135000, "2026-05-15");
    expect(w).not.toBeNull();
    expect(w.type).toBe("higher");
    expect(w.refOdometer).toBe(134700);
  });

  it("erkennt einen unplausibel großen Sprung seit der letzten Buchung ('jump')", () => {
    const w = checkOdometerPlausibility(base, vId, 999999, "2026-07-01");
    expect(w).not.toBeNull();
    expect(w.type).toBe("jump");
  });

  it("schließt die eigene Buchung beim Bearbeiten aus (excludeTxId)", () => {
    // "b" bearbeiten und ihren eigenen Wert erneut eingeben — keine Warnung
    // gegen sich selbst.
    const w = checkOdometerPlausibility(base, vId, 134700, "2026-06-01", "b");
    expect(w).toBeNull();
  });

  it("vergleicht nicht über Fahrzeuge hinweg", () => {
    const w = checkOdometerPlausibility(base, "andereVehicleId", 100, "2026-07-01");
    expect(w).toBeNull();
  });
});

describe("buildFuelSeries", () => {
  const vId = "v1";
  const txs = [
    {id:"t3", date:"2026-03-01", _fuelVehicleId:vId, _odometer:11000, _fuelLiters:40, _fuelPricePerL:1.9},
    {id:"t1", date:"2026-01-01", _fuelVehicleId:vId, _odometer:10000, _fuelLiters:35, _fuelPricePerL:1.7},
    {id:"t2", date:"2026-02-01", _fuelVehicleId:vId, _odometer:10500, _fuelLiters:38, _fuelPricePerL:1.8},
    {id:"other", date:"2026-01-15", _fuelVehicleId:"v2", _odometer:5000, _fuelLiters:20, _fuelPricePerL:1.8},
    {id:"noOdo", date:"2026-01-20", _fuelVehicleId:vId, _fuelLiters:10}, // ohne km-Stand → ausgeschlossen
  ];

  it("filtert auf das Fahrzeug, sortiert nach km-Stand und berechnet Verbrauch UND Kosten/km zwischen Nachbarn", () => {
    const series = buildFuelSeries(txs, vId);
    expect(series.map(t=>t.id)).toEqual(["t1","t2","t3"]);
    expect(series[0]._consumption).toBeNull(); // kein Vorgänger
    expect(series[0]._costPerKm).toBeNull();
    expect(series[1]._consumption).toBeCloseTo((38/500)*100, 5);
    expect(series[1]._costPerKm).toBeCloseTo((38*1.8)/500, 5);
    expect(series[2]._consumption).toBeCloseTo((40/500)*100, 5);
    expect(series[2]._costPerKm).toBeCloseTo((40*1.9)/500, 5);
  });

  it("liefert eine leere Liste für ein unbekanntes Fahrzeug", () => {
    expect(buildFuelSeries(txs, "unbekannt")).toEqual([]);
  });
});
