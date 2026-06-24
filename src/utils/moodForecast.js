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

// Pro Monat eines Jahres: Vorschau-Summen (Einnahmen/Ausgaben inkl. offenem
// Budget) + ob der Monat „kippt" (geplante Ausgaben > geplante Einnahmen).
//
// EINE Quelle der Wahrheit für die Schieflage: sowohl die Money-Mood-Ampel als
// auch der globale Warnbanner rufen diese Funktion auf — so können sie sich nie
// widersprechen. Identische Formel wie die Sparkline-Vorschau:
//   Seite = unkategorisierter Rest (Tx-Summe − kategorisiert) + Σ max(Ist+VM, Budget)
// Budget floort nur laufende/künftige Monate (isUpcoming).
export function monthlyStrain({
  year, cats = [], groups = [], pend,
  getActualSum, getBudgetForMonth, getTotalIncome, getTotalExpense,
  isUpcoming = () => true,
} = {}) {
  const beh = (g) => g.behavior || g.type;
  const isInc = (g) => beh(g) === "income" || g.type === "income";
  const isExp = (g) => beh(g) === "expense" || g.type === "expense"
    || (beh(g) !== "income" && g.type !== "income" && g.type !== "tagesgeld");
  const subsForGroups = (pred) => {
    const types = new Set(groups.filter(pred).map((g) => g.type));
    const out = [];
    cats.filter((c) => types.has(c.type)).forEach((c) => (c.subs || []).forEach((s) => out.push(s.id)));
    return out;
  };
  const incSubs = subsForGroups(isInc);
  const expSubs = subsForGroups(isExp);

  // Seiten-Summe: kategorisierte Subs budget-gefloort + unkategorisierter Rest.
  const sideTotal = (subIds, allTot, mi) => {
    let bvm = 0, fore = 0;
    subIds.forEach((subId) => {
      const b = Math.abs(getActualSum(year, mi, subId, "E") || 0) + (pend.sub[`${mi}:${subId}`] || 0);
      const budget = Math.abs(getBudgetForMonth(subId, year, mi) || 0);
      bvm += b;
      fore += isUpcoming(mi) ? Math.max(b, budget) : b;
    });
    return Math.max(0, allTot - bvm) + fore;
  };

  const strained = [], inc = [], exp = [];
  for (let mi = 0; mi < RANGE; mi++) {
    const allInc = Math.abs(getTotalIncome(year, mi) || 0) + (pend.incTot[mi] || 0);
    const allExp = Math.abs(getTotalExpense(year, mi) || 0) + (pend.expTot[mi] || 0);
    const i2 = sideTotal(incSubs, allInc, mi);
    const e2 = sideTotal(expSubs, allExp, mi);
    inc.push(i2); exp.push(e2); strained.push(e2 > i2);
  }
  return { strained, inc, exp };
}
