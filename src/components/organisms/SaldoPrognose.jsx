// Auto-generated module (siehe app-src.jsx)

import React, { useContext, useState } from "react";
import { AppCtx } from "../../state/AppContext.js";
import { theme as T, flaecheAbgesetzt } from "../../theme/activeTheme.js";
import { fmt, NUM_FONT } from "../../utils/format.js";
import { Li } from "../../utils/icons.jsx";

function SaldoPrognose({year, month, txs, detailMitte, detailEnde, saldoMitte, saldoEnde, getCat, getSub, initialOpen=null}) {
  if(window.MBT_DEBUG?.disable_drilldown) return null;
  const { selAcc, accounts } = React.useContext(AppCtx);
  const [drillOpen, setDrillOpen] = React.useState(initialOpen);
  // Im Hero-Modus steuert der Aufrufer über initialOpen, welcher Drilldown offen
  // ist (Tipp auf PrognoseMitte/-Ende). Die Komponente bleibt dabei gemountet,
  // daher muss der interne State dem wechselnden initialOpen folgen — sonst zeigt
  // der Drilldown weiter den alten Wert, während der Hero den neuen hervorhebt.
  React.useEffect(()=>{ if(initialOpen) setDrillOpen(initialOpen); }, [initialOpen]);
  const drill = drillOpen==="Mitte" ? detailMitte : drillOpen==="Ende" ? detailEnde : null;
  const fmtD = iso=>{const[,m,d]=iso.split("-");return `${d}.${m}.`;};
  return (
    <div style={{borderTop:`1px solid ${T.bd}`,paddingTop:0,marginTop:0}}>
      {/* Toggle-Header nur zeigen wenn nicht direkt aus Hero aufgerufen */}
      {!initialOpen&&<div style={{display:"flex",gap:3,alignItems:"flex-start"}}>
        <div style={{width:44,flexShrink:0}}/>
        {[["Mitte",T.mid,saldoMitte,detailMitte],["Ende",T.gold,saldoEnde,detailEnde],[null,null,null,null]].map(([label,col,saldo,det],i)=>(
          <div key={i} style={{flex:1,minWidth:0,textAlign:"center",
            cursor:label?"pointer":"default",
            background:label&&drillOpen===label?T.surf3:"transparent",
            borderRadius:8,padding:"3px 4px",transition:"background 0.15s"}}
            onClick={()=>label&&setDrillOpen(v=>v===label?null:label)}>
            {label&&saldo!==null&&(<>
              <div style={{color:col,fontSize:8,fontWeight:700,marginBottom:1,
                display:"flex",alignItems:"center",justifyContent:"center",gap:3}}>
                {label} {Li(drillOpen===label?"chevron-up":"chevron-down",8,col)}
              </div>
              <div style={{color:saldo>=0?T.pos:T.warn_icon,fontSize:12,fontWeight:700,fontFamily:NUM_FONT}}>
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
        // Schriftgroessen der Detailansicht — dieselben Werte wie im Aufriss des
// Dashboards ("Ausgaben bis 14."), damit beide Listen nicht in verschiedenen
// Groessen dastehen (Nutzer-Hinweis). Die Prognose lag durchweg 1-4px
// darunter, beim Betrag sogar 3,5px.
//   FS_TEXT   Beschreibung / Zeilentitel
//   FS_BETRAG Betrag der Zeile
//   FS_DETAIL Datum, Kategorie, Zusaetze
//   FS_MARKER Kennzeichnungen (vorgemerkt, wiederkehrend, verknuepft)
const FS_TEXT = 15, FS_BETRAG = 17, FS_DETAIL = 12, FS_MARKER = 11;

// Zeilenabstaende bewusst knapp: die Prognose zeigt nur an, hier wird nichts
// angetippt oder bearbeitet. Je mehr Zeilen ohne Scrollen im Bild stehen,
// desto besser laesst sich der Monat ueberblicken. Grosszuegig bleibt nur der
// Abstand ZWISCHEN den Budget-Karten — er trennt die Kategorien voneinander
// und von den uebrigen Zahlungen (Nutzer-Wunsch).

const TxRow = ({t,isInc,indent,dimmed,icon,iconCol,subId,isPending}) => {
          const cat=getCat((t.splits||[])[0]?.catId);
          const splitAmt = subId ? (t.splits||[]).find(sp=>sp.subId===subId)?.amount : null;
          const displayAmt = splitAmt!=null && splitAmt!==0 ? Math.abs(splitAmt) : Math.abs(t.totalAmount);
          // Reale Buchungen sind ihrer Natur nach immer abgeschlossen — immer
          // kräftiges Cyan (Ausgaben)/Limegreen (Einnahmen), kein Datumsbezug.
          const amtCol = isPending
            ? (isInc ? T.cell_inc : T.cell_exp)
            : (isInc ? T.cond_pos : T.neg);
          return (
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:1,paddingLeft:indent?10:0,opacity:dimmed?0.65:1}}>
              <span style={{color:T.txt2,fontSize:FS_DETAIL,flexShrink:0,fontFamily:NUM_FONT,width:36}}>{fmtD(t.date)}</span>
              {icon&&Li(icon,12,iconCol||T.txt2)}
              <span style={{color:dimmed?T.txt2:T.txt,flex:1,fontSize:FS_TEXT,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.desc||cat?.name||"—"}</span>
              {(t.tags||[]).map(tg=>(
                <span key={tg} style={{background:`${T.blue}1a`,color:T.blue,
                  borderRadius:5,padding:"1px 5px",fontSize:FS_MARKER,fontWeight:700,flexShrink:0}}>
                  #{tg}
                </span>
              ))}
              <span style={{color:amtCol,fontFamily:NUM_FONT,fontSize:FS_BETRAG,fontWeight:700,flexShrink:0}}>{isInc?"+":"−"}{fmt(displayAmt)}</span>
            </div>
          );
        };
        return (
          // Flaechen und Trennlinien aus dem Theme statt fest verdrahteter
          // Schwarz-/Weiss-Schleier: rgba(0,0,0,0.35) legte auf hellen Themes
          // eine dunkelgraue Platte mitten in die helle Seite, und die
          // rgba(255,255,255,...)-Linien darin waren dort unsichtbar
          // (Nutzer-Bilder). Jetzt dieselbe Sprache wie der Buchungen-/VM-/
          // unkat.-Aufriss: Panel auf surf3, Budget-Karten eine Stufe heller.
          <div style={{background:T.surf3,borderRadius:12,padding:"8px 13px 11px",fontSize:13,textAlign:"left"}}>
            {/* ── Saldo Ende + Warnungen + Summen — jetzt OBEN ── */}
            {(drill.overBudgetWarnings||[]).length>0&&(
              <div style={{background:`${T.warn_icon}1f`,border:`1px solid ${T.warn_icon}66`,borderRadius:8,padding:"7px 10px",marginBottom:6}}>
                <div style={{color:T.warn,fontSize:FS_DETAIL,fontWeight:700,marginBottom:4,display:"flex",alignItems:"center",gap:5}}>{Li("alert-triangle",12,T.warn)} Budget überschritten:</div>
                {drill.overBudgetWarnings.map((w,i)=>(<div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:FS_DETAIL,marginBottom:2}}><span style={{color:T.warn}}>{w.name}</span><span style={{fontFamily:NUM_FONT,color:T.warn}}>{fmt(w.actual)} {">"} {fmt(w.budget)}</span></div>))}
              </div>
            )}
            {/* Titel und Saldo in EINER Zeile: der Kopf stand vorher als eigene
                Zeile darueber ("Prognose Mitte (bis 14.)"), die Zeile darunter
                wiederholte mit "Saldo Mitte" praktisch dasselbe Wort. Zusammen-
                gelegt und gekuerzt spart das eine ganze Zeile (Nutzer-Wunsch).
                Ebenso weg: der Abstand zu den kleinen Summen darunter. */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,paddingBottom:0,marginBottom:0}}>
              <span style={{color:col,fontWeight:700,fontSize:FS_TEXT,display:"flex",alignItems:"center",gap:6,minWidth:0}}>
                {Li("bar-chart-2",15,col)} Prognose {label}
              </span>
              {(()=>{
                // Externe saldoMitte/saldoEnde haben Vorrang (sind konto-spezifisch wenn selAcc).
                // drill.saldo (immer Gesamt) nur als Fallback wenn extern nicht gesetzt.
                const ext = label==="Mitte" ? saldoMitte : saldoEnde;
                const sv = (ext!==null && ext!==undefined) ? ext : drill.saldo;
                return sv!==null && sv!==undefined
                  ? <span style={{color:sv>=0?T.pos:T.warn_icon,fontFamily:NUM_FONT,fontWeight:700,fontSize:20}}>{sv>=0?"+":"−"}{fmt(Math.abs(sv))}</span>
                  : null;
              })()}
            </div>
            {hasAny&&(drill.realIn+drill.pendIn+drill.realOut+drill.pendOut)>0&&(
              <div style={{display:"flex",gap:14,justifyContent:"flex-end",marginTop:0,marginBottom:6,paddingBottom:4,borderBottom:`1px solid ${T.bd}`}}>
                <span style={{color:T.pos,fontSize:FS_DETAIL,fontFamily:NUM_FONT}}>+{fmt(drill.realIn+drill.pendIn)}</span>
                <span style={{color:T.neg,fontSize:FS_DETAIL,fontFamily:NUM_FONT}}>−{fmt(drill.realOut+drill.pendOut)}</span>
              </div>
            )}
            {/* ── Buchungen/Budgets — scrollbar ── */}
            {hasAny&&(
              <div style={{maxHeight:"min(58vh,560px)",overflowY:"auto"}}>
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
                      const effCol=b.isInc?T.cell_inc:T.cell_exp;
                      const actual = b.realAmt+b.concAmt;
                      const openAmt = b.budget - actual;
                      return (
                        <div key={idx} style={{marginBottom:8,background:flaecheAbgesetzt(),borderRadius:8,padding:"5px 0"}}>
                          {/* Zeile 1: Datum + Icon + Name | offen rechts */}
                          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2}}>
                            <span style={{color:T.txt2,fontSize:FS_DETAIL,flexShrink:0,fontFamily:NUM_FONT,width:36}}>{fmtD(b.date)}</span>
                            {Li(overBudget?"alert-triangle":"target",12,overBudget?T.neg:effCol)}
                            {/* Kategoriename in normaler Textfarbe — wie im Buchungen-/
                                VM-/unkat.-Aufriss. Die Budget-Farbe traegt hier das
                                Symbol und der Betrag; der Name durchgehend eingefaerbt
                                liess die Prognose als einzige Liste komplett rot bzw.
                                cyan wirken (Nutzer-Bilder). Ausnahme bleibt das
                                ueberschrittene Budget — das ist ein Warnzustand. */}
                            <span style={{flex:1,minWidth:0,color:overBudget?T.neg:T.txt,fontSize:FS_TEXT,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{subName}</span>
                            {overBudget ? (
                              <span style={{color:T.neg,fontSize:FS_DETAIL,fontWeight:700,fontFamily:NUM_FONT,flexShrink:0}}>um {fmt(actual-b.budget)} drüber</span>
                            ) : (
                              <span style={{display:"inline-flex",alignItems:"baseline",gap:5,flexShrink:0}}>
                                <span style={{color:T.txt2,fontSize:FS_DETAIL}}>offen:</span>
                                {/* effCol statt fest cell_exp: Einnahmen-Budgets standen
                                    sonst in der Ausgaben-Farbe da. */}
                                <span style={{color:effCol,fontSize:FS_BETRAG,fontWeight:700,fontFamily:NUM_FONT}}>{b.isInc?"+":"−"}{fmt(openAmt)}</span>
                              </span>
                            )}
                          </div>
                          {/* Zeile 2: Budget links | genutzt rechts (unter dem Namen eingerückt) */}
                          <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",gap:6,marginBottom:2,paddingLeft:44}}>
                            <span style={{color:T.txt2,fontSize:FS_DETAIL}}>Budget: {b.isInc?"+":"−"}{fmt(b.budget)}</span>
                            <span style={{display:"inline-flex",alignItems:"baseline",gap:5}}>
                              <span style={{color:T.txt2,fontSize:FS_DETAIL}}>genutzt:</span>
                              <span style={{color:actual===0?T.txt2:overBudget?T.neg:effCol,fontSize:FS_DETAIL,fontWeight:700,fontFamily:NUM_FONT}}>{actual===0?"—":`${b.isInc?"+":"−"}${fmt(actual)}`}</span>
                            </span>
                          </div>
                          {/* Trennstrich vor Einzelbuchungen */}
                          {(b.realTxs.length>0||b.concTxs.length>0)&&<div style={{borderTop:`1px solid ${T.bd}`,margin:"2px 0 4px"}}/>}
                          {[...b.realTxs.map(t=>({t,isConc:false})),...b.concTxs.map(t=>({t,isConc:true}))].sort((a,c)=>c.t.date.localeCompare(a.t.date)).map(({t,isConc})=>isConc?(<TxRow key={t.id} t={t} isInc={b.isInc} indent dimmed isPending icon={t._seriesId?"repeat":"calendar"} iconCol={b.isInc?T.cell_inc:T.cell_exp} subId={b.baseSubId}/>):(<TxRow key={t.id} t={t} isInc={b.isInc} indent icon="check-circle" iconCol={T.pos} subId={b.baseSubId}/>))}
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
                          <div key={idx} style={{display:"flex",alignItems:"center",gap:8,padding:"1px 0",marginBottom:1}}>
                            {Li("arrow-right-left",13,umbBlue)}
                            <div style={{flex:1,minWidth:0}}>
                              <span style={{color:umbBlue,fontSize:FS_TEXT,fontWeight:700}}>
                              {fromAccName} → {targetAcc}
                            </span>
                              <span style={{color:T.txt2,fontSize:FS_DETAIL,marginLeft:6}}>{labelDesc}</span>
                            </div>
                            <span style={{color:umbBlue,fontSize:FS_BETRAG,fontWeight:700,fontFamily:NUM_FONT,flexShrink:0}}>
                              {fmt(Math.abs(t.totalAmount))} €
                            </span>
                          </div>
                        );
                      }
                      return <TxRow key={idx} t={t} isInc={t._csvType==="income"} isPending icon={t._seriesId?"repeat":"calendar"} iconCol={t._csvType==="income"?T.cell_inc:T.cell_exp}/>;
                    }
                    return <TxRow key={idx} t={item.data} isInc={item.data._csvType==="income"} icon="check-circle" iconCol={T.pos}/>;
                  })};
                  </>);
                })()}
              </div>
            )}
            {/* ── Vormonatssaldo — jetzt UNTEN ── */}
            <div style={{display:"flex",justifyContent:"space-between",borderTop:`1px solid ${T.bd}`,paddingTop:8,marginTop:8}}>
              <span style={{color:T.txt2,fontSize:FS_TEXT}}>Vormonatssaldo</span>
              <span style={{color:T.txt,fontFamily:NUM_FONT,fontSize:FS_BETRAG,fontWeight:700}}>{drill.base>=0?"+":"−"}{fmt(Math.abs(drill.base))}</span>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

export { SaldoPrognose };
