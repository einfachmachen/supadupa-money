// Auto-generated module (siehe app-src.jsx)

import React, { useContext, useState } from "react";
import { AppCtx } from "../../state/AppContext.js";
import { theme as T } from "../../theme/activeTheme.js";
import { fmt } from "../../utils/format.js";
import { Li } from "../../utils/icons.jsx";

function SaldoPrognose({year, month, txs, detailMitte, detailEnde, saldoMitte, saldoEnde, getCat, getSub, initialOpen=null}) {
  if(window.MBT_DEBUG?.disable_drilldown) return null;
  const { selAcc, accounts } = React.useContext(AppCtx);
  const [drillOpen, setDrillOpen] = React.useState(initialOpen);
  const drill = drillOpen==="Mitte" ? detailMitte : drillOpen==="Ende" ? detailEnde : null;
  const fmtD = iso=>{const[,m,d]=iso.split("-");return `${d}.${m}.`;};
  return (
    <div style={{borderTop:`1px solid rgba(255,255,255,0.07)`,paddingTop:0,marginTop:0}}>
      {/* Toggle-Header nur zeigen wenn nicht direkt aus Hero aufgerufen */}
      {!initialOpen&&<div style={{display:"flex",gap:3,alignItems:"flex-start"}}>
        <div style={{width:44,flexShrink:0}}/>
        {[["Mitte",T.mid,saldoMitte,detailMitte],["Ende",T.gold,saldoEnde,detailEnde],[null,null,null,null]].map(([label,col,saldo,det],i)=>(
          <div key={i} style={{flex:1,minWidth:0,textAlign:"center",
            cursor:label?"pointer":"default",
            background:label&&drillOpen===label?"rgba(255,255,255,0.07)":"transparent",
            borderRadius:8,padding:"3px 4px",transition:"background 0.15s"}}
            onClick={()=>label&&setDrillOpen(v=>v===label?null:label)}>
            {label&&saldo!==null&&(<>
              <div style={{color:col,fontSize:8,fontWeight:700,marginBottom:1,
                display:"flex",alignItems:"center",justifyContent:"center",gap:3}}>
                {label} {Li(drillOpen===label?"chevron-up":"chevron-down",8,col)}
              </div>
              <div style={{color:saldo>=0?T.pos:T.neg,fontSize:12,fontWeight:700,fontFamily:"monospace"}}>
                {saldo>=0?"+":"−"}{fmt(Math.abs(saldo))} €
              </div>
            </>)}
          </div>
        ))}
      </div>}
      {drill&&(()=>{
        const col = drillOpen==="Mitte"?T.mid:T.gold;
        const label = drillOpen;
        const cutDay = label==="Mitte" ? 14 : new Date(year,month+1,0).getDate();
        const realTxsD = txs.filter(t=>{
          if(t.pending||t._linkedTo) return false;
          const d=new Date(t.date);
          return d.getFullYear()===year&&d.getMonth()===month&&d.getDate()<=cutDay;
        });
        const budgets2 = (drill.budgetEntries||[]).filter(b=>{
          // Bei "Mitte" nur Budgets mit Datum <=14. anzeigen
          if(label!=="Mitte") return true;
          const bd = b.date || b.budgetTx?.date;
          if(!bd) return true; // ohne Datum: durchlassen
          const day = parseInt(bd.split("-")[2], 10);
          return day <= 14;
        });
        const unbPend = drill.unbudgetedPend||[];
        const unbReal = drill.unbudgetedRealTxs||realTxsD.filter(r=>!budgets2.some(b=>b.realTxs.find(br=>br.id===r.id)));
        const hasAny = budgets2.length>0||unbPend.length>0||unbReal.length>0;
        const TxRow = ({t,isInc,indent,dimmed,icon,iconCol,subId}) => {
          const cat=getCat((t.splits||[])[0]?.catId);
          const splitAmt = subId ? (t.splits||[]).find(sp=>sp.subId===subId)?.amount : null;
          const displayAmt = splitAmt!=null && splitAmt!==0 ? Math.abs(splitAmt) : Math.abs(t.totalAmount);
          return (
            <div style={{display:"flex",alignItems:"center",gap:4,marginBottom:2,paddingLeft:indent?12:0,opacity:dimmed?0.65:1}}>
              <span style={{color:T.txt2,fontSize:9,flexShrink:0,fontFamily:"monospace",width:28}}>{fmtD(t.date)}</span>
              {icon&&Li(icon,7,iconCol||T.txt2)}
              <span style={{color:dimmed?T.txt2:T.txt,flex:1,fontSize:9,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.desc||cat?.name||"—"}</span>
              <span style={{color:isInc?T.pos:T.neg,fontFamily:"monospace",fontSize:9,fontWeight:700,flexShrink:0}}>{isInc?"+":"−"}{fmt(displayAmt)}</span>
            </div>
          );
        };
        return (
          <div style={{marginTop:6,background:"rgba(0,0,0,0.35)",borderRadius:12,padding:"8px 10px",fontSize:10,textAlign:"left"}}>
            <div style={{color:col,fontWeight:700,fontSize:10,marginBottom:6,display:"flex",alignItems:"center",gap:4}}>
              {Li("bar-chart-2",11,col)} Prognose {label} ({label==="Mitte"?"bis 14.":"bis Monatsende"})
            </div>
            {/* ── Saldo Ende + Warnungen + Summen — jetzt OBEN ── */}
            {(drill.overBudgetWarnings||[]).length>0&&(
              <div style={{background:"rgba(255,159,67,0.12)",border:"1px solid rgba(255,159,67,0.4)",borderRadius:7,padding:"5px 8px",marginBottom:4}}>
                <div style={{color:T.warn,fontSize:9,fontWeight:700,marginBottom:3,display:"flex",alignItems:"center",gap:4}}>{Li("alert-triangle",9,T.warn)} Budget überschritten:</div>
                {drill.overBudgetWarnings.map((w,i)=>(<div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:9,marginBottom:1}}><span style={{color:T.warn}}>{w.name}</span><span style={{fontFamily:"monospace",color:T.warn}}>{fmt(w.actual)} {">"} {fmt(w.budget)}</span></div>))}
              </div>
            )}
            <div style={{display:"flex",justifyContent:"space-between",borderBottom:`1px solid ${col}44`,paddingBottom:5,marginBottom:6}}>
              <span style={{color:col,fontWeight:700}}>Saldo {label}</span>
              {(()=>{
                // Externe saldoMitte/saldoEnde haben Vorrang (sind konto-spezifisch wenn selAcc).
                // drill.saldo (immer Gesamt) nur als Fallback wenn extern nicht gesetzt.
                const ext = label==="Mitte" ? saldoMitte : saldoEnde;
                const sv = (ext!==null && ext!==undefined) ? ext : drill.saldo;
                return sv!==null && sv!==undefined
                  ? <span style={{color:sv>=0?T.pos:T.neg,fontFamily:"monospace",fontWeight:700,fontSize:12}}>{sv>=0?"+":"−"}{fmt(Math.abs(sv))}</span>
                  : null;
              })()}
            </div>
            {hasAny&&(drill.realIn+drill.pendIn+drill.realOut+drill.pendOut)>0&&(
              <div style={{display:"flex",gap:12,justifyContent:"flex-end",marginBottom:6,paddingBottom:4,borderBottom:`1px solid rgba(255,255,255,0.07)`}}>
                <span style={{color:T.pos,fontSize:9,fontFamily:"monospace"}}>+{fmt(drill.realIn+drill.pendIn)}</span>
                <span style={{color:T.neg,fontSize:9,fontFamily:"monospace"}}>−{fmt(drill.realOut+drill.pendOut)}</span>
              </div>
            )}
            {/* ── Buchungen/Budgets — scrollbar ── */}
            {hasAny&&(
              <div style={{maxHeight:340,overflowY:"auto"}}>
                {(()=>{
                  // Alle Einträge normalisieren und gemeinsam sortieren
                  const sortDate = t => t.date.length<=7 ? t.date+"-99" : t.date;
                  const budgetSortDate = b => {
                    const dates = [...(b.realTxs||[]), ...(b.concTxs||[])].map(t=>t.date).filter(Boolean);
                    return dates.length ? [...dates].sort().reverse()[0] : (b.date||"");
                  };
                  // unbPend-Einträge in passende Budget-Blöcke einmischen (nach catId)
                  const budgets2WithPend = budgets2.map(b=>{
                    const bCatId = (b.budgetTx?.splits||[])[0]?.catId;
                    const bSubId = b.baseSubId;
                    if(!bCatId) return b; // kein catId → keine Einmischung
                    const extra = unbPend.filter(t=>
                      !((t.desc||"").startsWith("Sparen·")) && // Sparplan nie einmischen
                      (t.splits||[]).some(sp=>sp.catId===bCatId && (sp.subId===bSubId || !sp.subId || sp.subId===""))
                    );
                    return extra.length ? {...b, concTxs:[...(b.concTxs||[]),...extra]} : b;
                  });
                  const usedInBudget = new Set(budgets2WithPend.flatMap(b=>
                    b.concTxs.filter(t=>!budgets2.find(ob=>ob.concTxs.includes(t))).map(t=>t.id)
                  ));
                  const remainingUnbPend = unbPend.filter(t=>!usedInBudget.has(t.id));
                  const allItems = [
                    ...budgets2WithPend.map(b=>({type:"budget", date:budgetSortDate(b), data:b})),
                    ...remainingUnbPend.map(t=>({type:"pend", date:t.date, data:t})),
                    ...unbReal.map(t=>({type:"real", date:t.date, data:t})),
                  ].sort((a,b2)=>{
                    // Budgets immer zuerst
                    if(a.type==="budget"&&b2.type!=="budget") return -1;
                    if(a.type!=="budget"&&b2.type==="budget") return 1;
                    // Innerhalb Budgets: nach cutDay-Datum (Monatsende/Tag14) dann Name
                    if(a.type==="budget"&&b2.type==="budget") {
                      const dA=a.data.date||"", dB=b2.data.date||"";
                      if(dA!==dB) return dB.localeCompare(dA); // spätestes Datum zuerst
                      const nA=(a.data.budgetTx?.desc||""), nB=(b2.data.budgetTx?.desc||"");
                      return nA.localeCompare(nB);
                    }
                    return b2.date.localeCompare(a.date);
                  });
                  return (<>
                    {allItems.map((item,idx)=>{
                    if(item.type==="budget") {
                      const b=item.data;
                      const sub=getSub(getCat((b.budgetTx.splits||[])[0]?.catId)?.id||"",b.baseSubId)||getCat((b.budgetTx.splits||[])[0]?.catId);
                      const subName=sub?.name||b.budgetTx.desc||"Budget";
                      const overBudget=(b.realAmt+b.concAmt)>b.budget;
                      const effCol=b.isInc?T.pos:T.neg;
                      const actual = b.realAmt+b.concAmt;
                      const openAmt = b.budget - actual;
                      return (
                        <div key={idx} style={{marginBottom:6,background:"rgba(255,255,255,0.04)",borderRadius:8,padding:"5px 7px",border:`1px solid rgba(255,255,255,0.07)`}}>
                          {/* Header: Datum + Name | Budget links, offen rechts */}
                          <div style={{display:"flex",alignItems:"center",gap:4,marginBottom:4}}>
                            <span style={{color:T.txt2,fontSize:9,flexShrink:0,fontFamily:"monospace",width:28}}>{fmtD(b.date)}</span>
                            {Li(overBudget?"alert-triangle":"target",8,overBudget?T.neg:T.gold)}
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{color:overBudget?T.neg:T.gold,fontSize:9,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{subName}</div>
                              <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",gap:6}}>
                                <span style={{color:T.txt2,fontSize:8}}>Budget: −{fmt(b.budget)}</span>
                                {overBudget ? (
                                  <span style={{color:T.neg,fontSize:8,fontWeight:700,fontFamily:"monospace"}}>um {fmt(actual-b.budget)} über</span>
                                ) : (
                                  <span style={{display:"inline-flex",alignItems:"baseline",gap:4}}>
                                    <span style={{color:T.txt2,fontSize:8}}>offen:</span>
                                    <span style={{color:T.gold,fontSize:9,fontWeight:700,fontFamily:"monospace"}}>−{fmt(openAmt)}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          {/* Zahlen-Block: nur "genutzt" */}
                          <div style={{display:"flex",flexDirection:"column",gap:2,marginBottom:4}}>
                            <div style={{display:"flex",justifyContent:"flex-end",alignItems:"baseline",gap:6}}>
                              <span style={{color:T.txt2,fontSize:8}}>genutzt:</span>
                              <span style={{color:actual===0?T.txt2:overBudget?T.neg:effCol,fontSize:9,fontWeight:700,fontFamily:"monospace"}}>{actual===0?"—":`−${fmt(actual)}`}</span>
                            </div>
                          </div>
                          {/* Trennstrich vor Einzelbuchungen */}
                          {(b.realTxs.length>0||b.concTxs.length>0)&&<div style={{borderTop:`1px solid rgba(255,255,255,0.08)`,margin:"2px 0 4px"}}/>}
                          {[...b.realTxs.map(t=>({t,isConc:false})),...b.concTxs.map(t=>({t,isConc:true}))].sort((a,c)=>c.t.date.localeCompare(a.t.date)).map(({t,isConc})=>isConc?(<TxRow key={t.id} t={t} isInc={b.isInc} indent dimmed icon={t._seriesId?"repeat":"calendar"} iconCol={T.gold} subId={b.baseSubId}/>):(<TxRow key={t.id} t={t} isInc={b.isInc} indent icon="check-circle" iconCol={T.pos} subId={b.baseSubId}/>))}
                        </div>
                      );
                    }
                    if(item.type==="pend") {
                      const t = item.data;
                      const isSpar = (t.desc||"").startsWith("Sparen·");
                      // ── Counterpart-Suche ─────────────────────────────────
                      // Eine "Umbuchung" hat immer zwei Seiten: Ausgabe-Seite (from-Konto) + Einnahme-Seite (to-Konto).
                      // Konvention für Anzeige: NUR die Ausgabe-Seite rendert die blaue Umbuchungs-Zeile.
                      // Die Einnahme-Seite überspringt sich selbst, damit keine Doppelanzeige.
                      const findCounterpart = (myTx) => {
                        // 1. Direkter _linkedTo-Match (bidirektional)
                        let c = txs.find(t2 => t2.pending && t2.id !== myTx.id &&
                          (t2._linkedTo === myTx.id || myTx._linkedTo === t2.id));
                        if(c) return c;
                        // 2. Sparplan-Pattern über _seriesId+"-tgt" oder "_in"
                        if(myTx._seriesId) {
                          c = txs.find(t2 => t2.pending && t2.id !== myTx.id &&
                            (t2._seriesId === myTx._seriesId+"-tgt" || t2._seriesId === myTx._seriesId+"_in" ||
                             myTx._seriesId === t2._seriesId+"-tgt" || myTx._seriesId === t2._seriesId+"_in") &&
                            t2.date === myTx.date && t2.accountId !== myTx.accountId);
                          if(c) return c;
                        }
                        // 3. Heuristik: gleiches Datum, gleicher Betrag, gleiche Beschreibung, andere Konten
                        c = txs.find(t2 => t2.pending && t2.id !== myTx.id &&
                          t2.date === myTx.date &&
                          Math.abs(t2.totalAmount) === Math.abs(myTx.totalAmount) &&
                          t2.accountId !== myTx.accountId &&
                          (t2.desc||"") === (myTx.desc||""));
                        return c || null;
                      };
                      const counterpart = findCounterpart(t);
                      // Bestimme welche Seite (von/nach) — die Ausgabe rendert, die Einnahme überspringt
                      // Logik: Wenn t Einnahme ist (entweder via _csvType==="income" oder positiver totalAmount),
                      // dann ist t die "to"-Seite und sie überspringt sich selbst (im Gesamt-Modus).
                      const isIncomeSide = (myTx) =>
                        myTx._csvType === "income" ||
                        (!myTx._csvType && myTx.totalAmount > 0) ||
                        !!myTx._linkedTo; // Einnahme-Counterparts haben _linkedTo
                      // Im Gesamt-Modus: wenn Counterpart existiert UND wir die Einnahme-Seite sind, überspringen
                      if(!selAcc && counterpart && isIncomeSide(t) && !isIncomeSide(counterpart)) {
                        return null;
                      }
                      // Im Gesamt-Modus: blaue Umbuchungs-Zeile rendern wenn Counterpart vorhanden
                      if(!selAcc && counterpart) {
                        const umbBlue = "#4A9FD4";
                        const labelDesc = isSpar ? (t.desc||"").replace("Sparen·","") : (t.desc||"");
                        // "from" = Ausgabe-Seite, "to" = Einnahme-Seite
                        const expenseSide = isIncomeSide(t) ? counterpart : t;
                        const incomeSide  = isIncomeSide(t) ? t : counterpart;
                        const fromAccName = accounts.find(a=>a.id===expenseSide.accountId)?.name || "?";
                        const targetAcc  = accounts.find(a=>a.id===incomeSide.accountId)?.name || incomeSide.accountId || "?";
                        return (
                          <div key={idx} style={{display:"flex",alignItems:"center",gap:6,padding:"3px 0",marginBottom:2}}>
                            {Li("arrow-right-left",10,umbBlue)}
                            <div style={{flex:1,minWidth:0}}>
                              <span style={{color:umbBlue,fontSize:10,fontWeight:700}}>
                              {fromAccName} → {targetAcc}
                            </span>
                              <span style={{color:T.txt2,fontSize:9,marginLeft:6}}>{labelDesc}</span>
                            </div>
                            <span style={{color:umbBlue,fontSize:11,fontWeight:700,fontFamily:"monospace",flexShrink:0}}>
                              {fmt(Math.abs(t.totalAmount))} €
                            </span>
                          </div>
                        );
                      }
                      return <TxRow key={idx} t={t} isInc={t._csvType==="income"} icon={t._seriesId?"repeat":"calendar"} iconCol={T.gold}/>;
                    }
                    return <TxRow key={idx} t={item.data} isInc={item.data._csvType==="income"} icon="check-circle" iconCol={T.pos}/>;
                  })};
                  </>);
                })()}
              </div>
            )}
            {/* ── Vormonatssaldo — jetzt UNTEN ── */}
            <div style={{display:"flex",justifyContent:"space-between",borderTop:`1px solid rgba(255,255,255,0.07)`,paddingTop:4,marginTop:4}}>
              <span style={{color:T.txt2}}>Vormonatssaldo</span>
              <span style={{color:T.txt,fontFamily:"monospace"}}>{drill.base>=0?"+":"−"}{fmt(Math.abs(drill.base))}</span>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

export { SaldoPrognose };
