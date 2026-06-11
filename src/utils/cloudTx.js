// Kanonische Komprimierung von Buchungen für den Cloud-Sync (Cloudflare/Gist).
//
// SICHERES PRINZIP (Blacklist): es werden ALLE Felder einer Buchung übernommen,
// AUSSER den wenigen, die bei jeder Anzeige ohnehin neu berechnet werden.
// Dadurch kann kein dauerhaftes Feld mehr "durchrutschen" — frühere Whitelist-
// Versionen hatten genau so valueDate (nur CF) und _potSubId (CF+Gist) verloren.
//
// Nur diese Felder sind Laufzeit-/Anzeige-Werte und werden weggelassen:
// die Budget-Paar-Gruppierung aus utils/budgets.js (groupBudgetPairs) hängt
// _mitteAmt/_endeAmt/_isBudgetPair/_partnerId an Anzeige-Kopien — die landen
// normalerweise gar nicht im gespeicherten Bestand; wir strippen sie trotzdem
// defensiv, falls je eine Anzeige-Kopie in den Speicherpfad gelangt.
const RUNTIME_FIELDS = new Set(["_mitteAmt", "_endeAmt", "_isBudgetPair", "_partnerId"]);

export function compressTx(t) {
  const c = {};
  for (const k of Object.keys(t)) {
    if (RUNTIME_FIELDS.has(k)) continue;
    const v = t[k];
    if (v === undefined || v === null) continue;        // Leeres weglassen (kompakt)
    if (Array.isArray(v) && v.length === 0) continue;    // leere Arrays weg
    if (k === "repeatMonths" && v === 1) continue;       // Default weg
    c[k] = v;
  }
  return c;
}

// Buchungen nach Jahr gruppieren (für die jahrweise Speicherung in der Cloud).
export function compressTxByYear(txs) {
  const byYear = {};
  for (const t of (txs || [])) {
    const y = new Date(t.date).getFullYear();
    (byYear[y] ||= []).push(compressTx(t));
  }
  return byYear;
}
