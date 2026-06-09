// Auto-generated module (siehe app-src.jsx)

import { isDuplCounterpart } from "./tx.js";
import { pn } from "./format.js";

const groupBudgetPairs = (txList) => {
  const result = [];
  const usedIds = new Set();
  txList.forEach(tx=>{
    if(usedIds.has(tx.id)) return;
    if(tx._budgetSubId && tx._budgetSubId.endsWith("_mitte")) {
      const endSubId = tx._budgetSubId.slice(0,-6);
      const [y,m] = tx.date.split("-");
      const partner = txList.find(t=>!usedIds.has(t.id)&&t.id!==tx.id&&
        t._budgetSubId===endSubId&&t.date.startsWith(`${y}-${m}`));
      if(partner) {
        usedIds.add(tx.id); usedIds.add(partner.id);
        result.push({...tx,_mitteAmt:tx.totalAmount,_endeAmt:partner.totalAmount,
          _partnerId:partner.id,_isBudgetPair:true});
        return;
      }
    }
    if(tx._budgetSubId && !tx._budgetSubId.endsWith("_mitte")) {
      const mitteSubId = tx._budgetSubId+"_mitte";
      const [y,m] = tx.date.split("-");
      const partner = txList.find(t=>!usedIds.has(t.id)&&t.id!==tx.id&&
        t._budgetSubId===mitteSubId&&t.date.startsWith(`${y}-${m}`));
      if(partner) {
        usedIds.add(tx.id); usedIds.add(partner.id);
        result.push({...tx,_mitteAmt:partner.totalAmount,_endeAmt:tx.totalAmount,
          _partnerId:partner.id,_isBudgetPair:true});
        return;
      }
    }
    usedIds.add(tx.id);
    result.push(tx);
  });
  return result;
};

// Day of month from ISO date string

// Ist-Ausgaben einer Unterkategorie im Tagesbereich [fromDay..toDay] auf acc-giro
// (reale + konkrete Vormerkungen, ohne Budget-Platzhalter & CSV-Duplikate).
// Identisch zur kanonischen Logik in saldo.js istForSub.
const istForSubInList = (txs, txsById, year, month, subId, fromDay, toDay) => {
  let sum = 0;
  for(const t of (txs||[])) {
    if(t._budgetSubId) continue;
    if(isDuplCounterpart(t, txsById)) continue;
    if((t.accountId||"acc-giro") !== "acc-giro") continue;
    const d = new Date(t.date);
    if(d.getFullYear()!==year || d.getMonth()!==month) continue;
    const dd = d.getDate();
    if(dd < fromDay || dd > toDay) continue;
    // Flexibler Topf: Buchungen mit _potSubId zählen budgetmäßig KOMPLETT gegen
    // die Topf-Sub (und NICHT gegen ihre echte Sub). Greift nur, wenn gesetzt.
    if(t._potSubId) {
      if(t._potSubId === subId) sum += Math.abs(pn(t.totalAmount)||0);
      continue;
    }
    for(const sp of (t.splits||[])) {
      if(sp.subId !== subId) continue;
      sum += (sp.amount!=null && sp.amount!==0) ? Math.abs(pn(sp.amount)) : Math.abs(t.totalAmount||0);
    }
  }
  return sum;
};

// Offenes Restbudget für einen Budget-Platzhalter (pending tx mit _budgetSubId).
//   Mitte (_mitte): MitteBudget − Ist(1..14)
//   Ende:           GesamtBudget (Mitte+Ende) − Ist(1..Monatsletzter)
// Positiv = noch offen, negativ = überschritten. Null wenn kein Budget-Platzhalter.
const budgetOpenRestFor = (tx, txs, txsById, year, month) => {
  if(!tx || !tx._budgetSubId) return null;
  const isMitte = tx._budgetSubId.endsWith("_mitte");
  const baseSubId = isMitte ? tx._budgetSubId.slice(0,-6) : tx._budgetSubId;
  const lastDay = new Date(year, month+1, 0).getDate();
  if(isMitte) {
    const mitteBudget = Math.abs(pn(tx.totalAmount)||0);
    return mitteBudget - istForSubInList(txs, txsById, year, month, baseSubId, 1, 14);
  }
  // Ende-Platzhalter: Gesamtbudget = dieser + evtl. Mitte-Platzhalter desselben Subs
  const monthPfx = `${year}-${String(month+1).padStart(2,"0")}`;
  const mitteTx = (txs||[]).find(t=>t.pending && t._budgetSubId===baseSubId+"_mitte" && (t.date||"").startsWith(monthPfx));
  const gesamt = Math.abs(pn(tx.totalAmount)||0) + (mitteTx ? Math.abs(pn(mitteTx.totalAmount)||0) : 0);
  return gesamt - istForSubInList(txs, txsById, year, month, baseSubId, 1, lastDay);
};

export { groupBudgetPairs, istForSubInList, budgetOpenRestFor };
