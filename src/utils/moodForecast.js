// Basis der Money-Mood-Vorschau: offene Vormerkungen (pending) je
// Unterkategorie/Monat plus Gesamt-Summen (Einnahmen/Ausgaben) für EIN Jahr.
//
// Wiederkehrende Vormerkungen (Serien) — auch künftige Einnahmen, die bis weit
// in die Zukunft angelegt sind — werden als ganz normale pending-Tx materialisiert
// (je Termin ein Datensatz) und hier deshalb automatisch mitgezählt.
//
// Bewusst ausgenommen:
//   • Budget-Platzhalter (_budgetSubId): das Budget kommt separat über
//     getBudgetForMonth; doppelt zählen würde die Vorschau verfälschen.
//   • Counterpart-Seiten von Umbuchungen (_linkedTo).
//   • Konto-fremde Tx, wenn ein Konto-Filter (selAcc) aktiv ist — analog zu den
//     Ist-Summen.

import { pn } from "./format.js";

const RANGE = 12;

export function pendingForecast(txs, { year, selAcc = null, catTypeById = {} } = {}) {
  const accOk = (tx) => !selAcc ? true
    : ((!tx.accountId && selAcc === "acc-giro") ? true : tx.accountId === selAcc);
  const sub = {};                                  // `${m}:${subId}` → Betrag (abs)
  const incTot = Array(RANGE).fill(0), expTot = Array(RANGE).fill(0);
  (txs || []).forEach(tx => {
    if (!tx.pending || tx._linkedTo || tx._budgetSubId || !accOk(tx)) return;
    const d = new Date(tx.date);
    if (d.getFullYear() !== year) return;
    const m = d.getMonth();
    (tx.splits || []).forEach(sp => {
      if (!sp.subId) return;
      const k = `${m}:${sp.subId}`;
      sub[k] = (sub[k] || 0) + Math.abs(pn(sp.amount));
    });
    // Gesamt-Typ wie in actualSums: Kategorietyp, dann _csvType, dann Vorzeichen.
    const ct0 = catTypeById[(tx.splits || [])[0]?.catId];
    const type = ct0 === "income" ? "income" : ct0 === "expense" ? "expense"
      : (tx._csvType || (tx.totalAmount >= 0 ? "income" : "expense"));
    const amt = Math.abs(tx.totalAmount || 0);
    if (type === "income") incTot[m] += amt; else expTot[m] += amt;
  });
  return { sub, incTot, expTot };
}
