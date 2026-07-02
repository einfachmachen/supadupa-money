// Tank-Erfassung: Erkennung der Kategorie "Tanken" + Verbrauchsberechnung.
// Zusatzfelder an Buchungen (siehe TODO.md): _fuelVehicleId, _fuelLiters,
// _fuelPricePerL, _odometer — nur gesetzt, wenn beim Erfassen ausgefüllt.

// Feste Kategorie "Tanken" (exakt, case-insensitive) — bewusst kein Fuzzy-Match
// auf Empfänger/Notiz, um Fehlerkennung zu vermeiden.
function isFuelCat(cat) {
  return (cat?.name || "").trim().toLowerCase() === "tanken";
}

function hasFuelData(tx) {
  return !!(tx && (tx._fuelLiters != null || tx._odometer != null));
}

// Verbrauch (l/100km) zwischen zwei aufeinanderfolgenden Tankvorgängen
// desselben Fahrzeugs: Menge des SPÄTEREN Tankvorgangs (füllt die seit dem
// vorherigen Tanken gefahrene Strecke wieder auf) / Distanz * 100.
function calcConsumption(prevOdo, nextOdo, nextLiters) {
  if (prevOdo == null || nextOdo == null || nextLiters == null) return null;
  const dist = nextOdo - prevOdo;
  if (!(dist > 0) || !(nextLiters > 0)) return null;
  return (nextLiters / dist) * 100;
}

// Liefert je Fahrzeug die Tankvorgänge (chronologisch nach km-Stand sortiert)
// mit berechnetem Verbrauch seit dem jeweils vorherigen Tankvorgang.
function buildFuelSeries(txs, vehicleId) {
  const rows = (txs || [])
    .filter(t => t._fuelVehicleId === vehicleId && t._odometer != null)
    .sort((a, b) => a._odometer - b._odometer || String(a.date).localeCompare(String(b.date)));
  return rows.map((t, i) => {
    const prev = rows[i - 1];
    const consumption = prev ? calcConsumption(prev._odometer, t._odometer, t._fuelLiters) : null;
    return { ...t, _consumption: consumption };
  });
}

export { isFuelCat, hasFuelData, calcConsumption, buildFuelSeries };
