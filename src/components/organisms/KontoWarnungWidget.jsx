// Auto-generated module (siehe app-src.jsx)

import React, { useContext, useEffect, useMemo, useState } from "react";
import { MonatScreen } from "../screens/MonatScreen.jsx";
import { AppCtx } from "../../state/AppContext.js";
import { theme as T } from "../../theme/activeTheme.js";
import { MONTHS_S } from "../../utils/constants.js";
import { fmt, pn, NUM_FONT } from "../../utils/format.js";
import { Li } from "../../utils/icons.jsx";

function KontoWarnungWidget({showFolgemonateToggle=false, onCountChange, hidden=false}) {
  if(window.MBT_DEBUG?.disable_warnings) return null;
  const { txs, cats, year, month, getKumulierterSaldo,  getCat, budgets, navigateToSparen, selAcc, accounts, getBudgetForMonth, liquidityWarnings } = useContext(AppCtx);
  const [folgemonate, setFolgemonate] = React.useState(false);
  const [showFolgemonate, setShowFolgemonate] = React.useState(false);
  const [expandedMonths, setExpandedMonths] = React.useState(new Set());

  // Zentral berechnete Warnungen aus dem Context (computeKontoWarnungen) — exakt
  // dieselbe Quelle, die auch das Schieflage-Banner und Money Mood nutzen.
  const warnings = liquidityWarnings || [];

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
                  {w.nextPos?(()=>{const[,wm,wd]=(w.nextPos.date||"").split("-");return<>Ausgleichen bis <span style={{color:T.gold,fontWeight:700}}>{parseInt(wd)}.{parseInt(wm)}.</span>{w.nextPos.name&&` (${w.nextPos.name})`} — mindestens <span style={{color:T.neg,fontWeight:700,fontFamily:NUM_FONT}}>{fmt(w.deficit)} €</span> einplanen</>})():<>Kein Ausgleich — mindestens <span style={{color:T.neg,fontWeight:700,fontFamily:NUM_FONT}}>{fmt(w.deficit)} €</span> fehlen</>}
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
                      ? <>Ausgleichen bis <span style={{color:T.gold,fontWeight:700}}>{nextLabel}</span>{d.nextPos?.name&&` (${d.nextPos.name})`} — mindestens <span style={{color:T.neg,fontWeight:700,fontFamily:NUM_FONT}}>{fmt(d.deficit)} €</span></>
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
