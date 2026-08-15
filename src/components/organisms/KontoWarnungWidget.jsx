// Auto-generated module (siehe app-src.jsx)

import React, { useContext, useEffect, useMemo, useState } from "react";
import { MonatScreen } from "../screens/MonatScreen.jsx";
import { AppCtx } from "../../state/AppContext.js";
import { theme as T } from "../../theme/activeTheme.js";
import { MONTHS_S } from "../../utils/constants.js";
import { fmt, pn, NUM_FONT } from "../../utils/format.js";
import { betrag } from "../../utils/betrag.jsx";
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
  // Warnungen-Symbol ist immer das LINKESTE der drei Icons — die linke obere
  // Ecke sitzt also bündig unter dem Tab und bleibt eckig (nahtloser
  // Übergang, kein Trennstrich); alle anderen Ecken sind rund. Kein eigener
  // Rand mehr oben (der frühere borderTop in Akzentfarbe passte nicht zur
  // Tab-Fläche, die inzwischen direkt den Warnbox-Farbton nutzt, und wirkte
  // dadurch selbst wie eine unpassende Trennlinie).
  const cardRadius = "0 10px 10px 10px";

  return (
    <div style={{margin:"0 10px 4px",borderRadius:cardRadius}}>
      {warnings.slice(0, showFolgemonate ? warnings.length : 1).map((w,i)=>{
        const mKey = `${w.year}-${w.month}`;
        const isExpanded = expandedMonths.has(mKey);
        const hasMultiple = (w.allDays||[]).length > 1;
        const isFuture = w.year!==year||w.month!==month;
        const toggleExpand = () => setExpandedMonths(prev=>{
          const s=new Set(prev); s.has(mKey)?s.delete(mKey):s.add(mKey); return s;
        });
        return (
          // Erste Box ohne oberen Abstand (i===0): sonst entsteht genau die
          // dünne, andersfarbige Lücke zum Tab darüber, die wie eine
          // Trennlinie wirkt — der Tab berührt das Panel jetzt direkt.
          <div key={i} style={{margin:`${i===0?0:2}px 0 3px`,borderRadius:i===0?"0 8px 8px 8px":8,overflow:"hidden",
            border:`1px solid ${T.neg}44`,borderTop:i===0?"none":`1px solid ${T.neg}44`}}>
            {/* Monats-Header — immer sichtbar */}
            <div onClick={hasMultiple?toggleExpand:undefined}
              style={{background:`${T.neg}18`,padding:"7px 10px",
                display:"flex",alignItems:"center",gap:10,
                cursor:hasMultiple?"pointer":"default"}}>
              {/* Warndreieck entfernt — die 3 Symbole in der Icon-Zeile oben
                  reichen als Kennzeichnung. Kein Platzhalter mehr: Text
                  beginnt jetzt bündig mit "offene VM" im Vormerkungen-Tab. */}
              <div style={{flex:1,minWidth:0}}>
                <div style={{color:T.acc_neg,fontSize:12,fontWeight:700,lineHeight:1.3}}>
                  {isFuture&&<span style={{color:T.acc_gold,fontSize:10,marginRight:6}}>{MONTHS_S[w.month]} {w.year}</span>}
                  {hasMultiple
                    ? (w.minPuffer>0
                      ? <>{(w.allDays||[]).length}× unter Puffer ({betrag(w.minPuffer)} €) — schlimmste: {betrag(w.saldoVal)} €</>
                      : <>{(w.allDays||[]).length}× Kontostand im Minus — schlimmste: −{betrag(w.deficit)} €</>)
                    : (w.minPuffer>0
                      ? <>Ab {(()=>{const[,dm,dd]=w.date.split("-");return`${parseInt(dd)}.${parseInt(dm)}.`;})()} unter Puffer ({betrag(w.minPuffer)} €): {betrag(w.saldoVal)} €</>
                      : <>Ab {(()=>{const[,dm,dd]=w.date.split("-");return`${parseInt(dd)}.${parseInt(dm)}.`;})()}  Kontostand im Minus: −{betrag(w.deficit)} €</>)
                  }
                </div>
                {!hasMultiple&&<div style={{color:T.txt2,fontSize:10,marginTop:2}}>
                  {w.nextPos?(()=>{const[,wm,wd]=(w.nextPos.date||"").split("-");return<>Ausgleichen bis <span style={{color:T.acc_gold,fontWeight:700}}>{parseInt(wd)}.{parseInt(wm)}.</span>{w.nextPos.name&&` (${w.nextPos.name})`} — mindestens <span style={{color:T.acc_neg,fontWeight:700,fontFamily:NUM_FONT}}>{betrag(w.deficit)} €</span> einplanen</>})():<>Kein Ausgleich — mindestens <span style={{color:T.acc_neg,fontWeight:700,fontFamily:NUM_FONT}}>{betrag(w.deficit)} €</span> fehlen</>}
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
                  <div style={{color:T.acc_neg,fontSize:11,fontWeight:700}}>
                    Ab {fromLabel} −{betrag(d.deficit)} €
                  </div>
                  <div style={{color:T.txt2,fontSize:10}}>
                    {nextLabel
                      ? <>Ausgleichen bis <span style={{color:T.acc_gold,fontWeight:700}}>{nextLabel}</span>{d.nextPos?.name&&` (${d.nextPos.name})`} — mindestens <span style={{color:T.acc_neg,fontWeight:700,fontFamily:NUM_FONT}}>{betrag(d.deficit)} €</span></>
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
