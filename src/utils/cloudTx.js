// Kanonische Komprimierung von Buchungen für den Cloud-Sync (Cloudflare/Gist).
//
// Hintergrund: Es gab ZWEI inline-Kopien dieser Funktion in App.jsx, die
// auseinandergelaufen waren — die Cloudflare-Variante ließ `valueDate` weg
// (Datenverlust beim CF-Round-Trip), und BEIDE ließen `_potSubId` weg (das
// "Flexibler Topf"-Feld → Topf-Zuordnungen gingen über die Cloud verloren).
//
// Diese eine Quelle persistiert alle dauerhaften Felder einer Buchung und
// lässt nur die zur Laufzeit berechneten weg (_mitteAmt/_endeAmt/_isBudgetPair/
// _readOnlyAmount … — die werden bei jeder Anzeige neu abgeleitet).
//
// Es gibt bewusst KEINE separate Expansion: die komprimierte Buchung IST die
// Buchung (nur mit weniger Feldern); fehlende optionale Felder werden überall
// per `?.`/`||[]` toleriert.
export function compressTx(t) {
  const c = { id: t.id, date: t.date, totalAmount: t.totalAmount, accountId: t.accountId };
  if (t.desc)          c.desc = t.desc;
  if (t.pending)       c.pending = true;
  if (t._csvType)      c._csvType = t._csvType;
  if (t._budgetSubId)  c._budgetSubId = t._budgetSubId;
  if (t._potSubId)     c._potSubId = t._potSubId;          // "Flexibler Topf" — vorher verloren
  if (t._linkedTo)     c._linkedTo = t._linkedTo;
  if (t._seriesId)     c._seriesId = t._seriesId;
  if (t._seriesIdx)    c._seriesIdx = t._seriesIdx;
  if (t._seriesTotal)  c._seriesTotal = t._seriesTotal;
  if (t._seriesTyp)    c._seriesTyp = t._seriesTyp;
  if (t._fp)           c._fp = t._fp;
  if (t.note)          c.note = t.note;
  if (t.valueDate)     c.valueDate = t.valueDate;          // in CF-Variante vorher verloren
  if (t.repeatMonths && t.repeatMonths !== 1) c.repeatMonths = t.repeatMonths;
  if ((t.splits || []).length > 0)    c.splits = t.splits;
  if ((t.linkedIds || []).length > 0) c.linkedIds = t.linkedIds;
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
