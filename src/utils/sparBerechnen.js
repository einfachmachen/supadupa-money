// Sparplan-Kernberechnung: taggenauer Tiefst-Saldo eines Monats. 1:1
// extrahiert aus TagesgeldWidget (getMinTagessaldo), damit dieselbe, bereits
// genutzte Logik auch außerhalb des Widgets aufgerufen werden kann (siehe
// App.jsx: automatische Anpassung der LAUFENDEN Monatsrate bei
// Pufferunterschreitung, ohne die ganze Serie neu zu berechnen).
import { restMitte, restEnde, phaseStillReachable } from "./saldo.js";
import { isDuplCounterpart, buildTxIdMap } from "./tx.js";

// ctx: { txs, cats, accounts, getKumulierterSaldo, getCat, getBudgetForMonth, getProgEndeAccGlobal }
export function computeMinTagessaldo(y, m, virtualSpar = {}, accId, excludeSparDesc = null, ctx, today = new Date()) {
  const { txs = [], cats = [], accounts = [], getKumulierterSaldo, getCat, getBudgetForMonth, getProgEndeAccGlobal } = ctx;
  const effSelAcc = accId;
  const prevY = m === 0 ? y - 1 : y, prevM = m === 0 ? 11 : m - 1;
  const _prevIsPast = prevY < today.getFullYear() || (prevY === today.getFullYear() && prevM < today.getMonth());
  const baseSaldo = effSelAcc
    ? (_prevIsPast
        ? (getKumulierterSaldo(prevY, prevM, effSelAcc) ?? getProgEndeAccGlobal(prevY, prevM, effSelAcc))
        : (getProgEndeAccGlobal(prevY, prevM, effSelAcc) ?? getKumulierterSaldo(prevY, prevM, effSelAcc)))
    : (_prevIsPast
        ? getKumulierterSaldo(prevY, prevM)
        : getProgEndeAccGlobal(prevY, prevM));
  if (baseSaldo === null || baseSaldo === undefined) return { min: null, saldoEnde: null };
  let baseSaldoEff = baseSaldo;
  if (excludeSparDesc) {
    const oldSparBefore = txs.filter(t => {
      if (!t.pending || t._linkedTo) return false;
      if (t.desc !== excludeSparDesc) return false;
      const isAcc = !effSelAcc || t.accountId === effSelAcc || (!t.accountId && effSelAcc === "acc-giro");
      if (!isAcc) return false;
      const d = new Date(t.date);
      const idx = d.getFullYear() * 12 + d.getMonth();
      const targetIdx = y * 12 + m;
      return idx < targetIdx;
    });
    const correction = oldSparBefore.reduce((s, t) => s + Math.abs(t.totalAmount), 0);
    baseSaldoEff = baseSaldo + correction;
  }
  const lastDay = new Date(y, m + 1, 0).getDate();
  const pad2 = n => String(n).padStart(2, "0");
  const pfx = `${y}-${pad2(m + 1)}-`;
  const isAccTx = t => !effSelAcc || t.accountId === effSelAcc || (!t.accountId && effSelAcc === "acc-giro");
  const _txsById = buildTxIdMap(txs || []);
  const mTxs = txs.filter(t => {
    if (isDuplCounterpart(t, _txsById)) return false;
    if (excludeSparDesc && t.pending && t.desc === excludeSparDesc) return false;
    const d = new Date(t.date);
    return d.getFullYear() === y && d.getMonth() === m && isAccTx(t);
  });
  const signed = t => {
    const ct = t._csvType || (() => {
      const s = (t.splits || []).filter(sp => sp.catId);
      if (s.length > 0) { const c = getCat(s[0].catId); if (c) return (c.type === "income" || c.type === "tagesgeld") ? "income" : "expense"; }
      return t.totalAmount >= 0 ? "income" : "expense";
    })();
    return ct === "income" ? +Math.abs(t.totalAmount) : -Math.abs(t.totalAmount);
  };
  const _saldoCtx = { txs, cats, accounts, getKumulierterSaldo, getBudgetForMonth };
  const istGiroView = !effSelAcc || effSelAcc === "acc-giro";
  const obMitte = (istGiroView && phaseStillReachable(y, m, 14, _saldoCtx)) ? restMitte(y, m, _saldoCtx) : 0;
  const obEnde = (istGiroView && phaseStillReachable(y, m, lastDay, _saldoCtx)) ? restEnde(y, m, _saldoCtx) : 0;
  const isFutureDay = (d) => {
    const tY = today.getFullYear(), tM = today.getMonth(), tD = today.getDate();
    if (y > tY) return true;
    if (y < tY) return false;
    if (m > tM) return true;
    if (m < tM) return false;
    return d >= tD;
  };
  const saldoAt = (dayStr) => {
    const dayNum = parseInt(dayStr.split("-")[2]);
    const real = mTxs.filter(t => !t.pending && !t._budgetSubId && t.date <= dayStr).reduce((s, t) => s + signed(t), 0);
    const pend = mTxs.filter(t => t.pending && !t._budgetSubId && t.date <= dayStr).reduce((s, t) => s + signed(t), 0);
    const virt = Object.entries(virtualSpar).filter(([d]) => d <= dayStr).reduce((s, [, v]) => s + v, 0);
    const bd = !isFutureDay(dayNum) ? 0 : (dayNum >= 15 ? -obEnde : -obMitte);
    return baseSaldoEff + real + pend + virt + bd;
  };
  const tbReal = today;
  const isCurrentMonth = (y === tbReal.getFullYear() && m === tbReal.getMonth());
  const firstRelevantDay = isCurrentMonth ? tbReal.getDate() : 1;
  const firstRelevantStr = `${pfx}${pad2(firstRelevantDay)}`;
  const daysWithTxs = new Set();
  mTxs.forEach(t => { if (t.date >= firstRelevantStr) daysWithTxs.add(t.date); });
  [`${pfx}14`, `${pfx}15`, `${pfx}${pad2(lastDay)}`].forEach(d => { if (d >= firstRelevantStr) daysWithTxs.add(d); });
  daysWithTxs.add(firstRelevantStr);
  const allDays = [...daysWithTxs].sort();
  let minVal = null;
  allDays.forEach(ds => {
    const s = saldoAt(ds);
    if (minVal === null || s < minVal) minVal = s;
  });
  const saldoEnde = saldoAt(`${pfx}${pad2(lastDay)}`);
  return { min: minVal, saldoEnde };
}
