// Tank-Erfassung: Erkennung der Kategorie "Tanken" + Verbrauchsberechnung.
// Zusatzfelder an Buchungen (siehe TODO.md): _fuelVehicleId, _fuelLiters,
// _fuelPricePerL, _odometer — nur gesetzt, wenn beim Erfassen ausgefüllt.

// Feste Kategorie "Tanken" (exakt, case-insensitive) — bewusst kein Fuzzy-Match
// auf Empfänger/Notiz, um Fehlerkennung zu vermeiden.
function isFuelCat(cat) {
  return (cat?.name || "").trim().toLowerCase() === "tanken";
}

// "Tanken" kann sowohl Haupt- als auch Unterkategorie sein (z.B. Auto/Tanken)
// — beide Ebenen prüfen, sonst wird eine als Unterkategorie angelegte
// "Tanken"-Kategorie nicht erkannt.
function isFuelSelection(cat, sub) {
  return isFuelCat(sub) || isFuelCat(cat);
}

function hasFuelData(tx) {
  return !!(tx && (tx._fuelLiters != null || tx._odometer != null));
}

// Distanz zwischen zwei Tankvorgängen — geteilte Grundlage für Verbrauch UND
// Kosten/km, damit beide exakt dieselbe (validierte) Strecke zugrunde legen.
function calcDistance(prevOdo, nextOdo) {
  if (prevOdo == null || nextOdo == null) return null;
  const dist = nextOdo - prevOdo;
  return dist > 0 ? dist : null;
}

// Verbrauch (l/100km) zwischen zwei aufeinanderfolgenden Tankvorgängen
// desselben Fahrzeugs: Menge des SPÄTEREN Tankvorgangs (füllt die seit dem
// vorherigen Tanken gefahrene Strecke wieder auf) / Distanz * 100.
function calcConsumption(prevOdo, nextOdo, nextLiters) {
  const dist = calcDistance(prevOdo, nextOdo);
  if (dist == null || nextLiters == null || !(nextLiters > 0)) return null;
  return (nextLiters / dist) * 100;
}

// Kraftstoffkosten je gefahrenem km auf der Strecke seit dem vorherigen
// Tankvorgang: (getankte Menge × Preis/Liter des SPÄTEREN Tankvorgangs) /
// Distanz. Nutzt bewusst denselben Distanz-/Mengen-Bezug wie calcConsumption
// — Kosten/km = Verbrauch(l/100km) / 100 × Preis/Liter, nur direkt aus den
// Rohwerten gerechnet (robuster gegen Rundung als über den %-Wert).
function calcCostPerKm(prevOdo, nextOdo, nextLiters, nextPricePerL) {
  const dist = calcDistance(prevOdo, nextOdo);
  if (dist == null || nextLiters == null || nextPricePerL == null) return null;
  if (!(nextLiters > 0) || !(nextPricePerL > 0)) return null;
  return (nextLiters * nextPricePerL) / dist;
}

// Liefert je Fahrzeug die Tankvorgänge (chronologisch nach km-Stand sortiert)
// mit berechnetem Verbrauch UND Kosten/km seit dem jeweils vorherigen
// Tankvorgang (beide null bei der ersten Buchung — kein Vorgänger).
function buildFuelSeries(txs, vehicleId) {
  const rows = (txs || [])
    .filter(t => t._fuelVehicleId === vehicleId && t._odometer != null)
    .sort((a, b) => a._odometer - b._odometer || String(a.date).localeCompare(String(b.date)));
  return rows.map((t, i) => {
    const prev = rows[i - 1];
    const consumption = prev ? calcConsumption(prev._odometer, t._odometer, t._fuelLiters) : null;
    const costPerKm = prev ? calcCostPerKm(prev._odometer, t._odometer, t._fuelLiters, t._fuelPricePerL) : null;
    return { ...t, _consumption: consumption, _costPerKm: costPerKm };
  });
}

export { isFuelCat, isFuelSelection, hasFuelData, calcDistance, calcConsumption, calcCostPerKm, buildFuelSeries };
