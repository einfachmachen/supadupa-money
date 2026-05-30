// ─────────────────────────────────────────────────────────────────────
// Ankerpunkt-Logik: erkannten Kontostand "am Datum" → Monats-Ende-Anker
// ─────────────────────────────────────────────────────────────────────
//
// Hintergrund / Bug-Historie (Mai 2026):
//   CSV-Exporte enthalten Kontostände MIT konkretem Datum ("Kontostand am
//   TT.MM.JJJJ"). Diese wurden bisher 1:1 als Anker für [Jahr][Monat]
//   gespeichert. `getKumulierterSaldo` interpretiert einen Anker für Monat M
//   aber als "Saldo am ENDE von M" und addiert nur Buchungen ab Monat M+1.
//   Lag das Anker-Datum mitten im Monat (z. B. laufender Monat), wurden alle
//   Buchungen dieses Monats — auch die NACH dem Anker-Tag — verschluckt; der
//   angezeigte Kontostand "klebte" am Anker-Wert.
//
// Korrekte Umrechnung:
//   - Anker-Datum = letzter Tag des Monats  → echter Monats-Ende-Anker für
//     diesen Monat, Wert unverändert (z. B. DKB-Quartalsabrechnungen 31.03.,
//     30.06., …).
//   - Anker-Datum mitten im Monat → Anker für das ENDE des VORMONATS:
//       VormonatsEnde = Saldo(am Datum) − Σ(Buchungen dieses Monats bis inkl.
//                        Anker-Tag, auf diesem Konto)
//     Dann addiert `getKumulierterSaldo` alle Buchungen des Monats wieder
//     korrekt drauf — inkl. der Buchungen nach dem Anker-Tag.
//
// Die Summe nutzt exakt denselben Filter wie getKumulierterSaldo beim
// Wieder-Aufaddieren (pending & _linkedTo ausgeschlossen, gleiches Konto),
// damit Abzug und Wieder-Aufschlag konsistent sind.

function signedAmount(t) {
  const type = t._csvType || ((t.totalAmount || 0) >= 0 ? "income" : "expense");
  const abs = Math.abs(t.totalAmount || 0);
  return type === "income" ? abs : -abs;
}

// db: { saldo:Number, date:"YYYY-MM-DD" }
// txs: gesamte Tx-Liste (bestehend + frisch importiert)
// accId: Konto, auf das sich der erkannte Saldo bezieht
// Rückgabe: { year, month(0-basiert), value } für setStartBalances, oder null.
export function anchorFromDetectedBalance(db, txs, accId) {
  if (!db || typeof db.date !== "string" || typeof db.saldo !== "number") return null;
  const parts = db.date.split("-").map(Number);
  const y = parts[0], m1 = parts[1], d = parts[2];
  if (!y || !m1 || !d) return null;
  const m = m1 - 1; // 0-basiert
  const acc = accId || "acc-giro";

  const lastDay = new Date(y, m + 1, 0).getDate();
  if (d >= lastDay) {
    // Echtes Monats-Ende → unverändert als Anker für diesen Monat
    return { year: y, month: m, value: db.saldo };
  }

  // Mitten im Monat → auf Vormonats-Ende umrechnen
  const ym = db.date.slice(0, 7); // "YYYY-MM"
  const monthToDate = (txs || []).reduce((sum, t) => {
    if (t.pending || t._linkedTo) return sum;
    if ((t.accountId || "acc-giro") !== acc) return sum;
    if (typeof t.date !== "string" || t.date.length < 10) return sum;
    if (t.date.slice(0, 7) !== ym) return sum;     // nur dieser Monat
    if (t.date > db.date) return sum;              // nur bis inkl. Anker-Tag (ISO-Stringvergleich)
    return sum + signedAmount(t);
  }, 0);

  const prevM = m === 0 ? 11 : m - 1;
  const prevY = m === 0 ? y - 1 : y;
  return { year: prevY, month: prevM, value: db.saldo - monthToDate };
}
