// Auto-generated module (siehe app-src.jsx)

import React, { useContext, useEffect, useMemo, useState } from "react";
import { MonatScreen } from "../screens/MonatScreen.jsx";
import { AppCtx } from "../../state/AppContext.js";
import { theme as T } from "../../theme/activeTheme.js";
import { MONTHS_S } from "../../utils/constants.js";
import { fmt, pn } from "../../utils/format.js";
import { Li } from "../../utils/icons.jsx";
import { saldoAt as saldoAtUtil } from "../../utils/saldo.js";

function KontoWarnungWidget({showFolgemonateToggle=false, onCountChange, hidden=false}) {
  if(window.MBT_DEBUG?.disable_warnings) return null;
  const { txs, cats, year, month, getKumulierterSaldo,  getCat, budgets, navigateToSparen, selAcc, getProgEndeAccGlobal, accounts, getBudgetForMonth } = useContext(AppCtx);
  const [folgemonate, setFolgemonate] = React.useState(false);
  const [showFolgemonate, setShowFolgemonate] = React.useState(false);
  const [expandedMonths, setExpandedMonths] = React.useState(new Set());
  // Mindest-Puffer aus Konto-Property (acc-giro.minPuffer) — Quelle der Wahrheit
  const giroAcc = accounts.find(a=>a.id==="acc-giro");
  const puffer = giroAcc?.minPuffer || 0;

  const warnings = React.useMemo(()=>{
    // OPTIMIERUNG: Indices einmalig vorberechnen
    // txsByMonthGiro: Map<"y-m", txs[]> für Giro-Buchungen ohne _linkedTo
    // budgetTxByKey: Map<"subId|y-m", tx> für Budget-Platzhalter
    const txsByMonthGiro = new Map();
    const txsBySubId = new Map(); // Map<subId, txs[]>
    const budgetTxByKey = new Map(); // Map<"subId|y-m", tx>
    const subIdsWithBudgetEver = new Set();
    txs.forEach(t=>{
      const isGiro = t.accountId==="acc-giro" || !t.accountId;
      if(!t._linkedTo && isGiro) {
        const d=new Date(t.date);
        const k=`${d.getFullYear()}-${d.getMonth()}`;
        if(!txsByMonthGiro.has(k)) txsByMonthGiro.set(k, []);
        txsByMonthGiro.get(k).push(t);
        // Sub-ID Index für jede splits.subId
        (t.splits||[]).forEach(sp=>{
          if(sp.subId) {
            if(!txsBySubId.has(sp.subId)) txsBySubId.set(sp.subId, []);
            txsBySubId.get(sp.subId).push(t);
          }
        });
      }
      // Budget-Platzhalter Index
      if(t.pending && t._budgetSubId) {
        subIdsWithBudgetEver.add(t._budgetSubId);
        const d=new Date(t.date);
        const k=`${t._budgetSubId}|${d.getFullYear()}-${d.getMonth()}`;
        budgetTxByKey.set(k, t);
      }
    });
    // Gleiche PrognoseE-Logik wie Dashboard (getProgEnde) — mit Cache
    const _cache = {};
    const getProgEndeW = (y, m) => {
      const ck=`${y}-${m}`;
      if(ck in _cache) return _cache[ck];
      const tb = new Date();
      if(y<tb.getFullYear()||(y===tb.getFullYear()&&m<tb.getMonth())) {
        const v=getKumulierterSaldo(y,m); _cache[ck]=v; return v;
      }
      const pY=m===0?y-1:y, pM=m===0?11:m-1;
      const prev = getProgEndeW(pY, pM);
      if(prev===null||prev===undefined) return null;
      const lastD=new Date(y,m+1,0).getDate();
      const todayY=tb.getFullYear(),todayM=tb.getMonth(),todayD=tb.getDate();
      const isCur=y===todayY&&m===todayM,isPastM=y<todayY||(y===todayY&&m<todayM);
      const endeAbg=isPastM||(isCur&&todayD>=lastD);
      // Indices nutzen statt cats-Loop × txs.filter
      const monthTxs = txsByMonthGiro.get(`${y}-${m}`) || [];
      const inc = monthTxs.reduce((s,t)=>{
        if(t._budgetSubId) return s;
        if(endeAbg && t.pending) return s;
        const sa = (t.splits||[]).filter(sp=>{
          const c = sp.catId ? cats.find(c=>c.id===sp.catId) : null;
          return c && (c.type==="income"||c.type==="tagesgeld");
        }).reduce((a,sp)=>a+Math.abs(pn(sp.amount)),0);
        return s+sa;
      },0);
      const out = monthTxs.reduce((s,t)=>{
        if(t._budgetSubId) return s;
        if(t.pending && t._seriesTyp!=="finanzierung" && endeAbg) return s;
        const sa = (t.splits||[]).filter(sp=>{
          const c = sp.catId ? cats.find(c=>c.id===sp.catId) : null;
          return c && c.type==="expense";
        }).reduce((a,sp)=>a+Math.abs(pn(sp.amount)),0);
        return s+sa;
      },0);
      const v = prev+inc-out;
      _cache[ck]=v;
      return v;
    };

    const result = [];
    // Immer vom echten aktuellen Monat ausgehen (unabhängig vom angezeigten Monat)
    const todayReal = new Date();
    const curY = todayReal.getFullYear(), curM = todayReal.getMonth();
    // Immer alle Monate mit Vormerkungen prüfen — Toggle steuert nur wie viele angezeigt werden
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
      .slice(0, 24); // max 24 Monate prüfen
    // saldoAt-Kontext einmal über den ganzen Warnungs-Loop teilen, damit
    // _anchorCache/_txsById nicht je Monat neu aufgebaut wird.
    const _saldoCtx = { txs, cats, accounts, getKumulierterSaldo, getBudgetForMonth };
    allMonths.forEach(([y,m])=>{
      const prevY = m===0 ? y-1 : y, prevM = m===0 ? 11 : m-1;
      // Immer Giro-Saldo prüfen — Gesamtsaldo ist wegen Tagesgeld nie negativ.
      // Konsistent mit saldoAt/Hero: für vergangenen Vormonat den ECHTEN
      // Endsaldo via getKumulierterSaldo (ohne Vormerkungen). Sonst würden
      // unerledigte Vormerkungen aus dem Vormonat den Basissaldo verschieben
      // und Phantom-Defizite im aktuellen Monat erzeugen.
      const _tbReal = new Date();
      const prevIsPast = prevY < _tbReal.getFullYear() ||
        (prevY === _tbReal.getFullYear() && prevM < _tbReal.getMonth());
      const baseSaldo = prevIsPast
        ? (getKumulierterSaldo(prevY, prevM, "acc-giro")
            ?? getProgEndeAccGlobal(prevY, prevM, "acc-giro")
            ?? getProgEndeW(prevY, prevM))
        : (getProgEndeAccGlobal(prevY, prevM, "acc-giro")
            ?? getKumulierterSaldo(prevY, prevM, "acc-giro")
            ?? getProgEndeW(prevY, prevM)
            ?? (m===0 ? getKumulierterSaldo(y-1,11) : getKumulierterSaldo(y,m-1)));
      if(baseSaldo===null||baseSaldo===undefined) return;
      const lastDay = new Date(y,m+1,0).getDate();
      const pad2 = n=>String(n).padStart(2,"0");
      const pfx = `${y}-${pad2(m+1)}-`;
      // Nur Giro-Buchungen — aus vorberechnetem Index
      const mTxs = txsByMonthGiro.get(`${y}-${m}`) || [];
      const signedCache = new WeakMap();
      const signed = t => {
        if(signedCache.has(t)) return signedCache.get(t);
        const ct=t._csvType||(()=>{const s=(t.splits||[]).filter(sp=>sp.catId);if(s.length>0){const c=getCat(s[0].catId);if(c)return(c.type==="income"||c.type==="tagesgeld")?"income":"expense";}return t.totalAmount>=0?"income":"expense";})();
        const v = ct==="income"?+Math.abs(t.totalAmount):-Math.abs(t.totalAmount);
        signedCache.set(t, v);
        return v;
      };
      // Einmalig openBudget berechnen — identisch zu MonatScreen, nutzt Indices
      const calcOpenBudget = (maxDay) => {
        let total = 0;
        const dayStr = `${pfx}${pad2(maxDay)}`;
        const monthKey = `${y}-${m}`;
        cats.filter(c=>c.type==="expense"||c.type==="income").forEach(cat=>{
          (cat.subs||[]).forEach(sub=>{
            const mittePx = budgetTxByKey.get(`${sub.id}_mitte|${monthKey}`);
            const hasAnyMittePx = subIdsWithBudgetEver.has(sub.id+"_mitte");
            const mitteAmt=mittePx?Math.abs(pn(mittePx.totalAmount)):(hasAnyMittePx?0:(pn(budgets?.[sub.id+"_mitte"]?.amount)||0));
            const hasSplit=mitteAmt>0;
            let bgt=0;
            if(maxDay===14){if(!hasSplit)return;bgt=mitteAmt;}
            else{
              if(hasSplit){
                const endePx = budgetTxByKey.get(`${sub.id}|${monthKey}`);
                const hasAnyEndePx = subIdsWithBudgetEver.has(sub.id);
                bgt=mitteAmt+(endePx?Math.abs(pn(endePx.totalAmount)):(hasAnyEndePx?0:(pn(budgets?.[sub.id]?.amount)||0)));
              } else {
                const px = budgetTxByKey.get(`${sub.id}|${monthKey}`);
                const hasAnyPx = subIdsWithBudgetEver.has(sub.id);
                bgt=px?Math.abs(pn(px.totalAmount)):(hasAnyPx?0:(pn(budgets?.[sub.id]?.amount)||0));
              }
            }
            if(bgt<=0)return;
            // Nutze sub-Index — viel schneller als txs.filter
            const txsForSub = (txsBySubId.get(sub.id)||[]).filter(t=>{
              if(t._budgetSubId) return false;
              const d=new Date(t.date);
              return d.getFullYear()===y && d.getMonth()===m && t.date<=dayStr;
            });
            const spent = txsForSub.filter(t=>!t.pending).reduce((s,t)=>s+Math.abs((t.splits||[]).find(sp=>sp.subId===sub.id)?.amount||0),0);
            const pendS = txsForSub.filter(t=>t.pending).reduce((s,t)=>s+Math.abs((t.splits||[]).find(sp=>sp.subId===sub.id)?.amount||Math.abs(t.totalAmount)),0);
            if(cat.type==="expense") total+=Math.max(0,bgt-spent-pendS);
          });
        });
        return total;
      };
      // KONSISTENZ MIT HERO/MONAT: Tagessaldo direkt via saldoAt aus utils/saldo
      // berechnen. Vorher hat die Warnung eine eigene Summen-Schleife gefahren,
      // die _linkedTo-Transfers (z.B. Sparen·Tagesgeld) und Duplikate anders
      // behandelt hat als ist()/saldoAt — daraus entstanden Phantom-Defizite.
      const saldoByDay = {};
      for(let day=1; day<=lastDay; day++) {
        const dayStr = `${pfx}${pad2(day)}`;
        saldoByDay[dayStr] = saldoAtUtil(y, m, day, "acc-giro", _saldoCtx);
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
                (t._csvType==="income"||(()=>{const c=getCat((t.splits||[])[0]?.catId);return c&&(c.type==="income"||c.type==="tagesgeld");})()));
              nextPos = {date:dayStrs[j], name:inc[0]?.desc||getCat((inc[0]?.splits||[])[0]?.catId)?.name||null};
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
      // Immer alle Warnungen zurückgeben — Toggle steuert Anzeige
      return result;
  }, [txs, cats, getKumulierterSaldo, getCat, budgets, puffer, accounts]);

  useEffect(()=>{ if(onCountChange) onCountChange(warnings.length); }, [warnings.length, onCountChange]);

  if(hidden) return null;
  if(!warnings.length) return null;

  const MONTHS_S=["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"];

  return (
    <div style={{margin:"4px 10px"}}>
      {warnings.slice(0, showFolgemonate ? warnings.length : 1).map((w,i)=>{
        const mKey = `${w.year}-${w.month}`;
        const isExpanded = expandedMonths.has(mKey);
        const hasMultiple = (w.allDays||[]).length > 1;
        const isFuture = w.year!==year||w.month!==month;
        const toggleExpand = () => setExpandedMonths(prev=>{
          const s=new Set(prev); s.has(mKey)?s.delete(mKey):s.add(mKey); return s;
        });
        return (
          <div key={i} style={{margin:"2px 0 3px",borderRadius:8,overflow:"hidden",
            border:`1px solid ${T.neg}44`}}>
            {/* Monats-Header — immer sichtbar */}
            <div onClick={hasMultiple?toggleExpand:undefined}
              style={{background:`${T.neg}18`,padding:"7px 10px",
                display:"flex",alignItems:"center",gap:10,
                cursor:hasMultiple?"pointer":"default"}}>
              <div style={{flexShrink:0,width:28,height:28,borderRadius:8,
                background:`${T.neg}22`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                {Li("alert-triangle",14,T.neg)}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{color:T.neg,fontSize:12,fontWeight:700,lineHeight:1.3}}>
                  {isFuture&&<span style={{color:T.gold,fontSize:10,marginRight:6}}>{MONTHS_S[w.month]} {w.year}</span>}
                  {hasMultiple
                    ? (w.minPuffer>0
                      ? <>{(w.allDays||[]).length}× unter Puffer ({fmt(w.minPuffer)} €) — schlimmste: {fmt(w.saldoVal)} €</>
                      : <>{(w.allDays||[]).length}× Kontostand im Minus — schlimmste: −{fmt(w.deficit)} €</>)
                    : (w.minPuffer>0
                      ? <>Ab {(()=>{const[,dm,dd]=w.date.split("-");return`${parseInt(dd)}.${parseInt(dm)}.`;})()} unter Puffer ({fmt(w.minPuffer)} €): {fmt(w.saldoVal)} €</>
                      : <>Ab {(()=>{const[,dm,dd]=w.date.split("-");return`${parseInt(dd)}.${parseInt(dm)}.`;})()}  Kontostand im Minus: −{fmt(w.deficit)} €</>)
                  }
                </div>
                {!hasMultiple&&<div style={{color:T.txt2,fontSize:10,marginTop:2}}>
                  {w.nextPos?(()=>{const[,wm,wd]=(w.nextPos.date||"").split("-");return<>Ausgleichen bis <span style={{color:T.gold,fontWeight:700}}>{parseInt(wd)}.{parseInt(wm)}.</span>{w.nextPos.name&&` (${w.nextPos.name})`} — mindestens <span style={{color:T.neg,fontWeight:700,fontFamily:"monospace"}}>{fmt(w.deficit)} €</span> einplanen</>})():<>Kein Ausgleich — mindestens <span style={{color:T.neg,fontWeight:700,fontFamily:"monospace"}}>{fmt(w.deficit)} €</span> fehlen</>}
                </div>}
              </div>
              {hasMultiple&&<div style={{color:T.txt2,fontSize:10,flexShrink:0}}>
                {Li(isExpanded?"chevron-up":"chevron-down",12,T.txt2)}
              </div>}
            </div>
            {/* Aufgeklappte Einzel-Warnungen */}
            {isExpanded&&(w.allDays||[]).map((d,j)=>{
              const[,dm,dd]=d.date.split("-");
              const fromLabel=`${parseInt(dd)}.${parseInt(dm)}.`;
              const[,wm,wd]=(d.nextPos?.date||"").split("-");
              const nextLabel=d.nextPos?`${parseInt(wd)}.${parseInt(wm)}.`:null;
              return(
                <div key={j} style={{padding:"5px 10px 5px 48px",
                  borderTop:`1px solid ${T.neg}22`,background:`${T.neg}0C`}}>
                  <div style={{color:T.neg,fontSize:11,fontWeight:700}}>
                    Ab {fromLabel} −{fmt(d.deficit)} €
                  </div>
                  <div style={{color:T.txt2,fontSize:10}}>
                    {nextLabel
                      ? <>Ausgleichen bis <span style={{color:T.gold,fontWeight:700}}>{nextLabel}</span>{d.nextPos?.name&&` (${d.nextPos.name})`} — mindestens <span style={{color:T.neg,fontWeight:700,fontFamily:"monospace"}}>{fmt(d.deficit)} €</span></>
                      : <>Kein Ausgleich im Monat</>}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
      {warnings.length > 1 && (
        <div onClick={()=>setShowFolgemonate(v=>!v)}
          style={{margin:"2px 0 4px",padding:"5px 10px",textAlign:"center",
            color:T.txt2,fontSize:10,fontWeight:700,cursor:"pointer",
            background:"rgba(255,255,255,0.04)",borderRadius:8,
            border:`1px solid ${T.bd}`,display:"flex",alignItems:"center",justifyContent:"center",gap:4}}>
          {Li(showFolgemonate?"chevron-up":"chevron-down",10,T.txt2)}
          {showFolgemonate ? "Weniger anzeigen" : `+${warnings.length-1} weitere Warnung${warnings.length>2?"en":""}`}
        </div>
      )}
    </div>
  );
}

export { KontoWarnungWidget };
