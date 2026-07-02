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

// Grosszügige Schwelle für "ungewöhnlich großer Sprung" — normale
// Tankfüllungen (auch bei großen Tanks/sparsamen Fahrzeugen) liegen weit
// darunter; typische Zahlendreher/fehlende-Null-Fehler springen weit darüber.
const FUEL_JUMP_WARN_KM = 3000;

// Prüft einen neu eingegebenen km-Stand gegen andere Tankbuchungen desselben
// Fahrzeugs auf offensichtliche Eingabefehler (typischerweise eine fehlende
// oder zusätzliche Ziffer, z.B. "13400" statt "134000"). Vergleicht NUR
// gegen Buchungen VOR/NACH dem gewählten Datum (nicht gegen den globalen
// Höchststand) — sonst würde das nachträgliche Erfassen einer älteren
// Tankbuchung fälschlich als Fehler gemeldet, obwohl ein kleinerer km-Stand
// dort völlig normal ist. excludeTxId: die gerade bearbeitete Buchung selbst
// nicht mit sich vergleichen. Gibt {type, refOdometer, message} oder null
// zurück — eine Warnung, kein Speicher-Blocker (Editieren bleibt möglich).
function checkOdometerPlausibility(txs, vehicleId, newOdometer, date, excludeTxId) {
  if (newOdometer == null || !vehicleId) return null;
  const others = (txs || []).filter(t =>
    t._fuelVehicleId === vehicleId && t._odometer != null && t.id !== excludeTxId);
  if (!others.length) return null;

  const before = date ? others.filter(t => t.date <= date) : others;
  const after  = date ? others.filter(t => t.date > date) : [];

  const prevMax = before.length ? Math.max(...before.map(t => t._odometer)) : null;
  const nextMin = after.length ? Math.min(...after.map(t => t._odometer)) : null;

  if (prevMax != null && newOdometer < prevMax) {
    return { type: "lower", refOdometer: prevMax,
      message: `km-Stand liegt unter einer früheren Tankbuchung (${prevMax} km) — fehlt eine Ziffer?` };
  }
  if (nextMin != null && newOdometer > nextMin) {
    return { type: "higher", refOdometer: nextMin,
      message: `km-Stand liegt über einer späteren Tankbuchung (${nextMin} km) — zu viel eingegeben?` };
  }
  if (prevMax != null) {
    const diff = newOdometer - prevMax;
    if (diff > FUEL_JUMP_WARN_KM) {
      return { type: "jump", refOdometer: prevMax, diff,
        message: `Sehr großer Sprung seit der letzten Tankbuchung (+${diff} km) — zu viel eingegeben?` };
    }
  }
  return null;
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

export { isFuelCat, isFuelSelection, hasFuelData, calcDistance, calcConsumption, calcCostPerKm, checkOdometerPlausibility, buildFuelSeries };
