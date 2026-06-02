// ─────────────────────────────────────────────────────────────────────
// Ankerpunkt-Logik: taggenaue Kontostand-Anker
// ─────────────────────────────────────────────────────────────────────
//
// Hintergrund / Bug-Historie (Mai 2026):
//   CSV-Exporte enthalten Kontostände MIT konkretem Datum ("Kontostand am
//   TT.MM.JJJJ"). Früher wurde nur Jahr+Monat gespeichert und jeder Anker als
//   "Saldo am ENDE des Monats" interpretiert. Lag das Anker-Datum mitten im
//   Monat, wurden alle Buchungen dieses Monats NACH dem Anker-Tag verschluckt
//   — der angezeigte Kontostand "klebte" am Anker-Wert.
//
// Lösung: Anker sind TAGGENAU. getKumulierterSaldo addiert für den Anker-Monat
// nur Buchungen mit Tag > Anker-Tag (die bis inkl. Anker-Tag sind bereits im
// Anker-Wert enthalten), für alle Folgemonate alle Buchungen.
//
// ── Speicherformat (rückwärtskompatibel) ─────────────────────────────
//   startBalances[year][month][accId] ist entweder
//     - eine Zahl            → Monats-ENDE (Tag = letzter Tag des Monats)
//     - { v:Zahl, day:Zahl } → taggenau am Tag `day` des Monats
//   Monats-Ende-Anker (z. B. DKB-Quartalsabrechnungen 31.03., 30.06.) bleiben
//   schlichte Zahlen; nur Anker mitten im Monat brauchen die Objekt-Form.

// Letzter Tag des Monats (month0 = 0-basiert)
export function lastDayOfMonth(year, month0) {
  return new Date(year, month0 + 1, 0).getDate();
}

export function isLastDayOfMonth(year, month0, day) {
  return day >= lastDayOfMonth(year, month0);
}

// Wert eines gespeicherten Anker-Eintrags (Zahl ODER {v,day}) → Zahl | null
export function anchorValue(raw) {
  if (raw && typeof raw === "object") return typeof raw.v === "number" ? raw.v : null;
  return typeof raw === "number" ? raw : null;
}

// Tag eines gespeicherten Anker-Eintrags → Tag-Zahl oder null (= Monats-Ende)
export function anchorDay(raw) {
  return (raw && typeof raw === "object" && typeof raw.day === "number") ? raw.day : null;
}

// Effektiver Anker-Tag: bei Monats-Ende-Ankern (null) der letzte Tag des Monats.
export function effectiveAnchorDay(raw, year, month0) {
  const d = anchorDay(raw);
  return d == null ? lastDayOfMonth(year, month0) : d;
}

// Erzeugt den zu speichernden Eintrag: Monats-Ende → schlichte Zahl
// (rückwärtskompatibel), sonst taggenaues Objekt { v, day }.
export function makeAnchorEntry(value, year, month0, day) {
  return isLastDayOfMonth(year, month0, day) ? value : { v: value, day };
}

// Parser-Ergebnis ({ saldo, date:"YYYY-MM-DD" }) → { year, month(0-basiert), day, value }
export function anchorFromDetectedBalance(db) {
  if (!db || typeof db.date !== "string" || typeof db.saldo !== "number") return null;
  const parts = db.date.split("-").map(Number);
  const y = parts[0], m1 = parts[1], d = parts[2];
  if (!y || !m1 || !d) return null;
  return { year: y, month: m1 - 1, day: d, value: db.saldo };
}
