// Liquiditäts-Warnungen fürs Giro-Konto: prüft TAGGENAU, an welchen Tagen der
// prognostizierte Kontostand unter den Mindest-Puffer (acc-giro.minPuffer) fällt.
//
// EINE Quelle der Wahrheit: Sowohl das Dashboard-Widget (KontoWarnungWidget) als
// auch die globale Schieflage-Warnung (Banner) und die Money-Mood-Ampel rufen
// diese Funktion auf — so können sie sich nie widersprechen. (Früher rechnete die
// Money-Mood-„Schieflage" einen gröberen Monatsvergleich und wich vom Dashboard ab.)
//
// Rückgabe: Array von Monats-Warnungen, je
//   { year, month, date, deficit, minPuffer, saldoVal, nextPos, allDays }
// allDays = alle Tage des Monats unter Puffer; deficit/saldoVal = schlimmster Tag.

import { pn } from "./format.js";
import { restMitte, restEnde, phaseStillReachable, saldoAnchor } from "./saldo.js";
import { isDuplCounterpart, buildTxIdMap } from "./tx.js";

export function computeKontoWarnungen({
  txs = [], cats = [], accounts = [],
  getKumulierterSaldo, getCat, getBudgetForMonth, budgets,
  puffer = 0, maxMonths = 24,
} = {}) {
  // OPTIMIERUNG: Indices einmalig vorberechnen
  const txsByMonthGiro = new Map();   // Map<"y-m", txs[]> Giro ohne _linkedTo
  const txsBySubId = new Map();       // Map<subId, txs[]>
  const budgetTxByKey = new Map();    // Map<"subId|y-m", tx> Budget-Platzhalter
  const subIdsWithBudgetEver = new Set();
  txs.forEach(t=>{
    const isGiro = t.accountId==="acc-giro" || !t.accountId;
    if(!t._linkedTo && isGiro) {
      const d=new Date(t.date);
      const k=`${d.getFullYear()}-${d.getMonth()}`;
      if(!txsByMonthGiro.has(k)) txsByMonthGiro.set(k, []);
      txsByMonthGiro.get(k).push(t);
      (t.splits||[]).forEach(sp=>{
        if(sp.subId) {
          if(!txsBySubId.has(sp.subId)) txsBySubId.set(sp.subId, []);
          txsBySubId.get(sp.subId).push(t);
        }
      });
    }
    if(t.pending && t._budgetSubId) {
      subIdsWithBudgetEver.add(t._budgetSubId);
      const d=new Date(t.date);
      const k=`${t._budgetSubId}|${d.getFullYear()}-${d.getMonth()}`;
      budgetTxByKey.set(k, t);
    }
  });
  const result = [];
  const todayReal = new Date();
  const curY = todayReal.getFullYear(), curM = todayReal.getMonth();
  const monthSet = new Map();
  monthSet.set(`${curY}-${curM}`, [curY, curM]);
  txs.forEach(t=>{
    if(!t.pending||t._linkedTo) return;
    const d=new Date(t.date);
    const y=d.getFullYear(), m=d.getMonth();
    if(y<curY||(y===curY&&m<=curM)) return;
    monthSet.set(`${y}-${m}`,[y,m]);
  });
  const allMonths = [...monthSet.values()]
    .sort((a,b)=>a[0]*12+a[1]-(b[0]*12+b[1]))
    .slice(0, maxMonths);
  const _saldoCtx = { txs, cats, accounts, getKumulierterSaldo, getBudgetForMonth };
  const _txsById = buildTxIdMap(txs || []);
  const _tbReal2 = new Date();
  const _curY = _tbReal2.getFullYear(), _curMo = _tbReal2.getMonth(), _curDay = _tbReal2.getDate();
  const _signedAmount = (t) => {
    const type = t._csvType || (t.totalAmount >= 0 ? "income" : "expense");
    const abs = Math.abs(t.totalAmount || 0);
    return type === "income" ? abs : -abs;
  };
  allMonths.forEach(([y,m])=>{
    // Immer Giro-Saldo prüfen — Gesamtsaldo ist wegen Tagesgeld nie negativ.
    const baseSaldo = saldoAnchor(y, m, "acc-giro", _saldoCtx);
    if(baseSaldo===null||baseSaldo===undefined) return;
    const lastDay = new Date(y,m+1,0).getDate();
    const pad2 = n=>String(n).padStart(2,"0");
    const pfx = `${y}-${pad2(m+1)}-`;
    const mTxs = txsByMonthGiro.get(`${y}-${m}`) || [];
    // KONSISTENZ MIT HERO/MONAT: gleicher ist()-Filter wie saldoAt
    const monthTxs = (txs||[]).filter(t=>{
      if(t._budgetSubId) return false;
      if(isDuplCounterpart(t, _txsById)) return false;
      const acc = t.accountId || "acc-giro";
      if(acc !== "acc-giro") return false;
      const d = new Date(t.date);
      return d.getFullYear()===y && d.getMonth()===m;
    }).sort((a,b)=>a.date.localeCompare(b.date));
    const isFutureDay = (d) => {
      if(y > _curY) return true;
      if(y < _curY) return false;
      if(m > _curMo) return true;
      if(m < _curMo) return false;
      return d >= _curDay;
    };
    const sprungMitteVal = phaseStillReachable(y, m, 14, _saldoCtx)      ? restMitte(y, m, _saldoCtx) : 0;
    const sprungEndeVal  = phaseStillReachable(y, m, lastDay, _saldoCtx) ? restEnde(y, m, _saldoCtx)  : 0;
    const saldoByDay = {};
    let cumIst = 0, txIdx = 0;
    for(let day=1; day<=lastDay; day++) {
      const dayStr = `${pfx}${pad2(day)}`;
      while(txIdx < monthTxs.length && monthTxs[txIdx].date <= dayStr) {
        cumIst += _signedAmount(monthTxs[txIdx]);
        txIdx++;
      }
      const sprung = !isFutureDay(day) ? 0
                   : (day >= 15 ? sprungEndeVal : sprungMitteVal);
      saldoByDay[dayStr] = baseSaldo + cumIst - sprung;
    }
    const saldoAt = (dayStr) => saldoByDay[dayStr] ?? baseSaldo;
    const dayStrs = Array.from({length:lastDay},(_,i)=>`${pfx}${pad2(i+1)}`);
    const daysWithTxs = new Set(mTxs.map(t=>t.date));
    const minPuffer = puffer;
    const negDays = [];
    dayStrs.forEach((ds, idx) => {
      if(!daysWithTxs.has(ds)) return;
      const saldo = saldoAt(ds);
      if(saldo < minPuffer) {
        let nextPos = null;
        for(let j=idx+1; j<dayStrs.length; j++) {
          if(saldoAt(dayStrs[j]) >= minPuffer) {
            const inc = mTxs.filter(t=>t.date===dayStrs[j]&&
              (t._csvType==="income"||(()=>{const c=getCat&&getCat((t.splits||[])[0]?.catId);return c&&(c.type==="income"||c.type==="tagesgeld");})()));
            nextPos = {date:dayStrs[j], name:inc[0]?.desc||(getCat&&getCat((inc[0]?.splits||[])[0]?.catId)?.name)||null};
            break;
          }
        }
        negDays.push({date:ds, deficit:minPuffer-saldo, saldoVal:saldo, nextPos});
      }
    });
    if(negDays.length > 0) {
      const maxDeficit = Math.max(...negDays.map(d=>d.deficit));
      const worstDay = negDays.find(d=>d.deficit===maxDeficit);
      result.push({year:y, month:m, date:negDays[0].date, deficit:maxDeficit,
        minPuffer, saldoVal:worstDay.saldoVal,
        nextPos:worstDay.nextPos, allDays:negDays});
    }
  });
  return result;
}
