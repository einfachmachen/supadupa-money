// Gemeinsame Datenbasis für den SaldoHeroV2 — extrahiert aus der Monatsansicht,
// damit der Hero auch in "Money Mood" identisch berechnet wird. Liefert exakt die
// Props, die SaldoHeroV2 erwartet (Buch/VM/unkat je Mitte/Ende, Prognose, Detail,
// Saldo). Bewusst eigenständig gehalten, um Dashboard/Monat nicht zu verändern.

import { useContext, useMemo } from "react";
import { AppCtx } from "./AppContext.js";
import { isDuplCounterpart, buildTxIdMap } from "../utils/tx.js";
import { budgetOpenRestFor } from "../utils/budgets.js";
import { saldoAt, budgetPlaceholderActive } from "../utils/saldo.js";

export function useSaldoHeroData(year, month) {
  const {
    cats, txs, accounts, selAcc,
    getKumulierterSaldo, getBudgetForMonth, getPrognoseSaldoDetail, txType,
  } = useContext(AppCtx);

  const _isSelAcc = t => !selAcc || t.accountId === selAcc || (!t.accountId && selAcc === "acc-giro");
  const _txsById = useMemo(() => buildTxIdMap(txs), [txs]);
  const _isDupl = t => isDuplCounterpart(t, _txsById);
  const _saldoCtx = { txs, cats, accounts, getKumulierterSaldo, getBudgetForMonth };
  const _detailBase = (sa) => saldoAt(year, month, 0, sa, _saldoCtx);

  // ── Prognose-Detail (Drilldown) konto-gefiltert, wie in der Monatsansicht ──
  const _linkedPendIds = useMemo(() => {
    const s = new Set();
    (txs || []).forEach(t => { if (!t.pending && t._linkedTo) s.add(t._linkedTo); });
    return s;
  }, [txs]);
  const _filterDetailByAcc = (det, sa) => {
    if (!det) return det;
    const accMatchOrAny = (t) => !sa || (t.accountId || "acc-giro") === sa;
    const dropLinkedPend = (t) => !_linkedPendIds.has(t.id);
    const dropDuplReal = (t) => !isDuplCounterpart(t, _txsById);
    const filterBudgetEntry = (be) => {
      if (!be) return be;
      const realTxs = (be.realTxs || []).filter(accMatchOrAny).filter(dropDuplReal);
      const concTxs = (be.concTxs || []).filter(accMatchOrAny).filter(dropLinkedPend);
      const sumFor = (list) => list.reduce((s, t) => {
        const sp = (t.splits || []).find(sp => sp.subId === be.baseSubId);
        const amt = sp?.amount != null && sp.amount !== 0 ? Math.abs(sp.amount) : Math.abs(t.totalAmount);
        return s + amt;
      }, 0);
      return { ...be, realTxs, concTxs, realAmt: sumFor(realTxs), concAmt: sumFor(concTxs) };
    };
    const budgetEntries = sa && sa !== "acc-giro" ? [] : (det.budgetEntries || []).map(filterBudgetEntry);
    const unbudgetedPend = (det.unbudgetedPend || []).filter(accMatchOrAny).filter(dropLinkedPend);
    const unbudgetedRealTxs = (det.unbudgetedRealTxs || []).filter(accMatchOrAny).filter(dropDuplReal);
    const overBudgetWarnings = sa && sa !== "acc-giro" ? [] : (det.overBudgetWarnings || []);
    return { ...det, budgetEntries, unbudgetedPend, unbudgetedRealTxs, overBudgetWarnings };
  };
  const detailMitte = useMemo(() => {
    const base = getPrognoseSaldoDetail(year, month, true);
    if (!base) return null;
    return { ..._filterDetailByAcc(base, selAcc), saldo: saldoAt(year, month, 14, selAcc, _saldoCtx), base: _detailBase(selAcc) };
  }, [year, month, txs, accounts, selAcc]);
  const detailEnde = useMemo(() => {
    const base = getPrognoseSaldoDetail(year, month, false);
    if (!base) return null;
    const lastDay = new Date(year, month + 1, 0).getDate();
    return { ..._filterDetailByAcc(base, selAcc), saldo: saldoAt(year, month, lastDay, selAcc, _saldoCtx), base: _detailBase(selAcc) };
  }, [year, month, txs, accounts, selAcc]);

  // ── Hero-Summen (Buch/VM/unkat) — identisch zur Monatsansicht ──
  return useMemo(() => {
    const _tb = new Date(), _todayY = _tb.getFullYear(), _todayM = _tb.getMonth(), _todayD = _tb.getDate();
    const _isCurS = year === _todayY && month === _todayM, _isPastS = year < _todayY || (year === _todayY && month < _todayM);
    const _lastDayS = new Date(year, month + 1, 0).getDate();
    const _mitteAbg = _isPastS || (_isCurS && _todayD > 14);
    const _h2 = t => { const d = new Date(t.date); return d.getFullYear() === year && d.getMonth() === month && d.getDate() <= 14; };
    const prognoseMitte = saldoAt(year, month, 14, selAcc, _saldoCtx);
    const prognoseEnde = saldoAt(year, month, _lastDayS, selAcc, _saldoCtx);
    const _heroLinkedChildIds = (() => { const s = new Set(); txs.forEach(t => (t.linkedIds || []).forEach(id => s.add(id))); return s; })();
    const _heroMTxs = txs.filter(t => { const d = new Date(t.date); return d.getFullYear() === year && d.getMonth() === month && !t.pending && !_isDupl(t) && !_heroLinkedChildIds.has(t.id) && _isSelAcc(t); });
    const _heroPTxs = txs.filter(t => { const d = new Date(t.date); return d.getFullYear() === year && d.getMonth() === month && t.pending && _isSelAcc(t); });
    const _uncat = t => ((t.splits || []).length === 0 || (t.splits || []).every(s => !s.catId));
    const _realIn = _heroMTxs.filter(t => txType(t) === "income" && !_heroLinkedChildIds.has(t.id));
    const _realOut = _heroMTxs.filter(t => txType(t) === "expense" && !_heroLinkedChildIds.has(t.id));
    const _uIn = _heroMTxs.filter(t => txType(t) === "income" && !_heroLinkedChildIds.has(t.id) && _uncat(t));
    const _uOut = _heroMTxs.filter(t => txType(t) === "expense" && !_heroLinkedChildIds.has(t.id) && _uncat(t));
    const _sum = arr => arr.reduce((s, t) => s + Math.abs(t.totalAmount || 0), 0);
    const _realInM = _realIn.filter(_h2), _realOutM = _realOut.filter(_h2);
    const pTxsOut2 = _heroPTxs.filter(t => budgetPlaceholderActive(t) && (txType(t) === "expense" || (t._csvType === "expense" && txType(t) !== "income")));
    const pTxsIn2 = _heroPTxs.filter(t => budgetPlaceholderActive(t) && (txType(t) === "income" || (t._csvType === "income")));
    const _pTxsInM = _mitteAbg ? [] : pTxsIn2.filter(t => _h2(t) && (!t._budgetSubId || t._budgetSubId.endsWith("_mitte")));
    const _pTxsOutM = _mitteAbg ? [] : pTxsOut2.filter(t => _h2(t) && (!t._budgetSubId || t._budgetSubId.endsWith("_mitte")));
    const _uInM2 = _mitteAbg ? [] : _uIn.filter(_h2), _uOutM2 = _mitteAbg ? [] : _uOut.filter(_h2);
    const _pendVmAmt2 = (t) => t._budgetSubId ? Math.max(0, budgetOpenRestFor(t, txs, _txsById, year, month)) : Math.abs(t.totalAmount);
    const pendingIn2 = pTxsIn2.reduce((s, t) => s + _pendVmAmt2(t), 0);
    const pendingOut2 = pTxsOut2.reduce((s, t) => s + _pendVmAmt2(t), 0);

    return {
      buchInM: _sum(_realInM), buchOutM: _sum(_realOutM),
      buchInE: _sum(_realIn), buchOutE: _sum(_realOut),
      pendInM: _sum(_pTxsInM), pendOutM: _sum(_pTxsOutM),
      pendInE: pendingIn2, pendOutE: pendingOut2,
      uInM: _sum(_uInM2), uOutM: _sum(_uOutM2),
      uInE: _sum(_uIn), uOutE: _sum(_uOut),
      prognoseMitte, prognoseEnde,
      detailMitte, detailEnde,
      saldoMitte: selAcc ? prognoseMitte : null,
      saldoEnde: selAcc ? prognoseEnde : null,
    };
  }, [year, month, txs, cats, accounts, selAcc, detailMitte, detailEnde]);
}
