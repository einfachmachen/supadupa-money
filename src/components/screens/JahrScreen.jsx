// Auto-generated module (siehe app-src.jsx)

import React, { Fragment, useContext, useRef, useState } from "react";
import { AppCtx } from "../../state/AppContext.js";
import { theme as T, isLightTheme } from "../../theme/activeTheme.js";
import { getBC } from "../../theme/palette.js";
import { amtStyle } from "../../theme/amtPill.js";
import { groupBudgetPairs } from "../../utils/budgets.js";
import { BASE_ROWS, CUR_YEAR, MONTHS_F, MONTHS_S } from "../../utils/constants.js";
import { drillSort, fmt, pn, uid, NUM_FONT } from "../../utils/format.js";
import { Li } from "../../utils/icons.jsx";
import { saldoAt, saldoMitte, saldoEnde } from "../../utils/saldo.js";

function JahrScreen({forceSingle=false}) {
  const { cats,setCats,groups,setGroups,txs,setTxs,accounts,setAccounts,
    yearData,setYearData,year,setYear,month,setMonth,isLand,showAllMonths,
    hideEmptyRows, setHideEmptyRows,
    col3Name,setCol3Name,modal,setModal,mgmtCat,setMgmtCat,
    editTx,setEditTx,newTx,setNewTx,newCat,setNewCat,
    newSubName,setNewSubName,exportModal,setExportModal,
    getCat,getSub,txType,getActualSum,getBudgetForMonth,getTotalIncome,getTotalExpense,getKumulierterSaldo,getPrognoseSaldoDetail,getPendingSum,pendingItemsFor,
    getJV,setJV,getMV,setMV,getAcc,openEdit,saveEdit,deleteFromEdit,
    updEditSplit,moveCat,moveSub,updateSub,updateCat,
    renameCat,renameSub,deleteCat,deleteSub,saveNewCat,saveNewSub,
    moveAcc,
    addSplit,removeSplit,updSplit,splitTotal,splitDiff,txValid,saveTx,
    onTS,onTE,
    startBalances,
  } = useContext(AppCtx);

    const [jPendOpen, setJPendOpen] = useState(null);
    const [popup,     setPopup]     = useState(null);
    const [drilldown, setDrilldown] = useState(null);
    // hideEmptyRows jetzt im App-State (Context)
    const nowYear  = new Date().getFullYear();
    const nowMonth = new Date().getMonth();
    const headerScrollRef = useRef(null);
    const dataScrollRef   = useRef(null);

    // Jahresansicht zeigt immer alle Monate (showAllMonths=true by default)
    // forceSingle überschreibt für Modal-Verwendung
    const showMonths = forceSingle ? [month] : Array.from({length:12},(_,i)=>i);
    const LW=150, SW=forceSingle?84:52, MW=SW*3, RH=18, HH=34;
    const subLabels = {M:"Mitte",E:"Ende",D:col3Name};
    // buildRows direkt mit aktuellen cats+groups berechnen
    const hasSetup = groups.length > 0 || cats.length > 0;
    const jrows = (!hasSetup ? [] : (() => {
      const rows = [];
      BASE_ROWS.forEach(br => {
        rows.push(br);
        if(br.id==="ein_head") {
          groups.filter(g=>g.behavior==="income"||g.type==="income").forEach(grp=>{
            cats.filter(c=>c.type===grp.type).forEach(cat=>{
              rows.push({id:`jcat_${cat.id}`,label:cat.name,block:"ein",type:"subheader",cols:false,catId:cat.id});
              (cat.subs||[]).forEach(sub=>{
                rows.push({id:`jsub_${sub.id}`,label:sub.name,block:"ein",type:"auto",cols:true,subId:sub.id,catId:cat.id});
              });
            });
          });
        }
        if(br.id==="aus_head") {
          groups.filter(g=>{
            const beh=g.behavior||g.type;
            return beh==="expense"||g.type==="expense"||(beh!=="income"&&g.type!=="income"&&g.type!=="tagesgeld");
          }).forEach(grp=>{
            cats.filter(c=>c.type===grp.type).forEach(cat=>{
              rows.push({id:`jcat_${cat.id}`,label:cat.name,block:"aus",type:"subheader",cols:false,catId:cat.id});
              (cat.subs||[]).forEach(sub=>{
                rows.push({id:`jsub_${sub.id}`,label:sub.name,block:"aus",type:"auto",cols:true,subId:sub.id,catId:cat.id});
              });
            });
          });
        }
      });
      return rows;
    })()); // end hasSetup
    const curMonth = new Date().getMonth();
    const syncScroll = (src, dst) => { if(dst.current) dst.current.scrollLeft = src.current.scrollLeft; };

    const openPopup = (mi, id, sub, row) => {
      const stored = getJV(mi,id,sub);
      // For Mitte auto-col: prefill with the calculated sum if nothing stored yet
      const autoVal = ((sub==="M"||sub==="E") && row?.type==="auto" && row?.subId)
        ? String(getActualSum(year, mi, row.subId, sub)||"")
        : "";
      const initVal = stored !== "" ? stored : autoVal;
      setPopup({mi,id,sub,val:initVal,label:`${MONTHS_S[mi]} – ${subLabels[sub]}`,row});
    };
    const commitPopup = () => {
      if(!popup) return;
      const {mi, id, sub, val, row} = popup;

      // For Mitte (auto col): update the actual tx in txs that matches this subId + month
      if(sub==="M" && row?.type==="auto" && row?.subId){
        const newAmt = pn(val);
        setTxs(p => p.map(tx => {
          const d = new Date(tx.date);
          if(d.getFullYear()!==year || d.getMonth()!==mi || tx.pending) return tx;
          const hasSub = (tx.splits||[]).some(sp => sp.subId===row.subId);
          if(!hasSub) return tx;
          // Adjust the split amount; recalculate totalAmount from all splits
          const newSplits = (tx.splits||[]).map(sp =>
            sp.subId===row.subId ? {...sp, amount: newAmt} : sp
          );
          const newTotal = newSplits.reduce((s,sp)=>s+pn(sp.amount),0);
          return {...tx, totalAmount: newTotal, splits: newSplits};
        }));
        // Also clear any yearData override so display stays in sync
        setJV(mi, id, sub, "");
      } else {
        setJV(mi, id, sub, val);
      }
      setPopup(null);
    };

    // Light pastel-accented palette
    const darkGs = (block, type) => {
      const b = getBC()[block] || getBC().aus;
      const lookupType = (type==="highlight"||type==="result") ? type : (type || "row");
      const entry = b[lookupType] || b.row;
      return { bg:entry.bg, tx:entry.tx, bd:T.bd, accent:b.accent||entry.tx };
    };

    const VCell = ({mi,row}) => {
      const isAuto = row.type==="auto";
      const isTotalRow = row.id==="ein_head" || row.id==="aus_head" || row.id==="giro_diff" || row.id==="giro_saldo" || row.id==="giro_start";
      const cellKey = `${year}:${mi}:${row.id}`;

      return (
        <div style={{display:"flex",width:MW,minWidth:MW}}>
          {["M","E","D"].map(sub=>{
            // M, E und D sind alle Auto-Summen-Spalten für kategorisierte Zeilen
            // D (aktuell) = gleiche Summe wie E (alle Buchungen des Monats)
            const isSumCol  = isAuto && (sub==="M" || sub==="E" || sub==="D");
            const autoSumSub = sub==="D" ? "E" : sub; // D uses same sum as E
            const autoSum   = isSumCol ? getActualSum(year,mi,row.subId,autoSumSub) : null;
            const pendItems = (isAuto&&(sub==="M"||sub==="E")&&row.subId) ? pendingItemsFor(year,mi,row.subId,sub) : [];
            const pendSum   = pendItems.reduce((s,i)=>s+pn(i.amount),0);
            const stored    = getJV(mi,row.id,sub);
            // Live-Werte für Gesamtzeilen
            const liveTotal = isTotalRow ? (()=>{
              const col = sub==="D"?"E":sub; // D nutzt E-Wert
              if(row.id==="ein_head")  return getTotalIncome(year,mi,col);
              if(row.id==="aus_head")  return getTotalExpense(year,mi,col);
              if(row.id==="giro_diff") return getTotalIncome(year,mi,col)-getTotalExpense(year,mi,col);
              if(row.id==="giro_start") {
                // Anfangssaldo: kumulierter Saldo bis Ende Dez (year-1) = Startpunkt Jan year
                if(mi > 0) return null;
                return getKumulierterSaldo(year-1, 11);
              }
              if(row.id==="giro_saldo") {
                const isFuture = year > nowYear || (year===nowYear && mi > nowMonth);
                const isCurrentMonth = year===nowYear && mi===nowMonth;
                // Aktuell-Spalte (sub==="D"): immer echter Saldo ohne Prognose
                if(sub==="D") return getKumulierterSaldo(year, mi) ?? null;
                // Mitte + Ende: Prognose für aktuellen und zukünftige Monate
                if(isFuture || isCurrentMonth) {
                  // NEU: saldoMitte/saldoEnde aus utils/saldo.js statt getPrognoseSaldo
                  const _ctx = { txs, cats, accounts, getKumulierterSaldo, getBudgetForMonth };
                  return sub==="M"
                    ? (saldoMitte(year, mi, null, _ctx) ?? null)
                    : (saldoEnde(year, mi, null, _ctx) ?? null);
                }
                return getKumulierterSaldo(year, mi) ?? null;
              }
              return 0;
            })() : null;
            // M + E: manuelle Eingabe gewinnt (für fehlende Monate), sonst autoSum
            // D (aktuell): autoSum wenn vorhanden (gesperrt), sonst manuell (fehlende Monate)
            const dIsLocked = sub==="D" && (isTotalRow ? (liveTotal!=null && liveTotal!==0) : autoSum>0);
            const effVal    = isTotalRow
              ? (liveTotal!=null && liveTotal!==0 ? String(Math.abs(liveTotal).toFixed(2)) : stored!==""?stored:"")
              : sub==="D"
              ? (autoSum>0 ? String(autoSum) : stored!==""?stored:"") // D: auto wenn vorhanden, sonst manuell
              : isSumCol
                ? (stored!=="" ? stored                        // M/E: manuell hat Vorrang
                  : autoSum>0 ? String(autoSum)
                  : pendSum>0 ? String(pendSum) : "")
              : (stored!==""?stored:(pendSum>0?String(pendSum):""));
            const hasPend   = !isSumCol && pendItems.length>0;
            const isOverride= isSumCol && sub!=="D" && stored!=="" && autoSum>0; // M/E manuell überschrieben
            const isEmpty   = !effVal;
            const openKey   = `${cellKey}:${sub}`;
            const isPendOpen= jPendOpen===openKey;
            const dgs       = darkGs(row.block, isSumCol?"auto" : hasPend?"pending" : row.type);

            // Schraffur: wenn Ende ≠ aktuell (beide nicht leer) → alle 3 Spalten schraffieren
            const autoE     = isAuto&&row.subId ? getActualSum(year,mi,row.subId,"E") : 0;
            const autoD     = autoE; // D = E wenn CSV-Daten
            const storedD   = getJV(mi,row.id,"D");
            const effE_val  = (isAuto&&autoE>0) ? String(autoE) : getJV(mi,row.id,"E");
            const effD_val  = (autoD>0) ? String(autoD) : storedD;
            const rowHatch  = !!(effE_val && effD_val && pn(effE_val) !== pn(effD_val));
            const rowFull   = sub==="E" && autoE>0 && autoD>0;

            const isLastCol = sub==="D";
            const cellBg = "transparent";
            const isFutureGiroSaldo = row.id==="giro_saldo" && sub!=="D" &&
              (year > nowYear || (year===nowYear && mi >= nowMonth));
            const emptyCol = (isLightTheme())
              ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.12)";
            const textCol = isEmpty             ? emptyCol
                          : isOverride          ? T.gold
                          : isFutureGiroSaldo   ? T.blue
                          : T.txt;

            return (
              <div key={sub}
                onClick={()=>{
                  const colLabel = sub==="M"?"Mitte":sub==="E"?"Ende":"aktuell";
                  const maxDay   = sub==="M"?14:31;

                  // ── Kategorie-Zeilen (alle Spalten) ──────────────────────────────
                  if(row.subId && row.type==="auto") {
                    const txList = txs.filter(tx=>{
                      if(tx._linkedTo) return false;
                      const d=new Date(tx.date);
                      if(d.getFullYear()!==year || d.getMonth()!==mi) return false;
                      if(sub==="D" && tx.pending) return false; // aktuell = keine Vormerkungen
                      if(sub!=="D" && d.getDate()>maxDay) return false;
                      return (tx.splits||[]).some(sp=>sp.subId===row.subId);
                    });
                    setDrilldown({mi, subId:row.subId,
                      label:`${row.label} – ${MONTHS_F[mi]} (${colLabel})`, txList,
                      isOverride: sub!=="D" && isOverride,
                      rowId:row.id, sub,
                      storedVal:stored, autoVal:String(getActualSum(year,mi,row.subId,sub==="D"?"E":sub)||"")
                    });
                    return;
                  }

                  // ── Summenzeilen: Einnahmen / Ausgaben ────────────────────────────
                  if(row.id==="ein_head" || row.id==="aus_head") {
                    const isIncome = row.id==="ein_head";
                    const txList = txs.filter(tx=>{
                      if(tx._linkedTo) return false;
                      if(sub==="D" && tx.pending) return false;
                      const d=new Date(tx.date);
                      if(d.getFullYear()!==year || d.getMonth()!==mi) return false;
                      if(sub!=="D" && d.getDate()>maxDay) return false;
                      const type = txType(tx);
                      return isIncome ? type==="income" : type==="expense";
                    });
                    setDrilldown({mi, subId:null,
                      label:`${row.label} – ${MONTHS_F[mi]} (${colLabel})`,
                      txList, rowId:row.id, sub, isSumRow:true,
                      isIncome
                    });
                    return;
                  }

                  // ── EINNAHMEN–AUSGABEN (giro_diff) ────────────────────────────────
                  if(row.id==="giro_diff") {
                    const txList = txs.filter(tx=>{
                      if(tx._linkedTo) return false;
                      if(sub==="D" && tx.pending) return false;
                      const d=new Date(tx.date);
                      if(d.getFullYear()!==year || d.getMonth()!==mi) return false;
                      if(sub!=="D" && d.getDate()>maxDay) return false;
                      return true;
                    });
                    setDrilldown({mi, subId:null,
                      label:`Einnahmen – Ausgaben · ${MONTHS_F[mi]} (${colLabel})`,
                      txList, rowId:row.id, sub, isSumRow:true, isDiff:true
                    });
                    return;
                  }

                  // ── SALDO GIRO ────────────────────────────────────────────────────
                  if(row.id==="giro_saldo") {
                    const txList = txs.filter(tx=>{
                      if(tx._linkedTo) return false;
                      if(sub==="D" && tx.pending) return false;
                      const d=new Date(tx.date);
                      if(d.getFullYear()!==year || d.getMonth()!==mi) return false;
                      if(sub!=="D" && d.getDate()>maxDay) return false;
                      return true;
                    });
                    // Anfangssaldo für diesen Monat
                    let baseSaldo = null;
                    if(mi===0) baseSaldo = getKumulierterSaldo(year-1,11);
                    else baseSaldo = getKumulierterSaldo(year,mi-1);
                    setDrilldown({mi, subId:null,
                      label:`SALDO GIRO · ${MONTHS_F[mi]} (${colLabel})`,
                      txList, rowId:row.id, sub, isSaldoRow:true,
                      baseSaldo
                    });
                    return;
                  }

                  // ── Anfangssaldo ──────────────────────────────────────────────────
                  if(row.id==="giro_start") { openPopup(mi, row.id, sub, row); return; }

                  openPopup(mi, row.id, sub, row);
                }}
                title={sub==="D"&&dIsLocked?"Automatisch aus Buchungen – gesperrt":isSumCol?"tippen zum Überschreiben":undefined}
                style={{
                  width:SW, minWidth:SW, height:RH,
                  display:"flex", alignItems:"center", justifyContent:"flex-end",
                  padding:"0 5px", boxSizing:"border-box",
                  cursor: "pointer",
                  background: cellBg,
                  borderLeft: `1px solid rgba(0,0,0,0.08)`,
                  position:"relative",
                  ...(rowHatch ? {backgroundImage:"repeating-linear-gradient(45deg,rgba(0,0,0,0.06) 0,rgba(0,0,0,0.06) 2px,transparent 0,transparent 50%)",backgroundSize:"6px 6px"} : {}),
                }}>
                <span style={{fontSize:7,fontFamily:NUM_FONT,
                  fontWeight:["result","highlight","auto","pending"].includes(row.type)?700:500,
                  color: textCol,
                  whiteSpace:"nowrap",
                  fontStyle: "normal",
                  opacity:   hasPend&&sub!=="D"&&!isPendOpen ? 0.65 : 1,
                  textDecoration: hasPend&&sub!=="D" ? "underline dotted" : "none",
                }}>
                  {isEmpty ? "" : fmt(pn(effVal))}
                  {hasPend&&sub!=="D"&&<span style={{marginLeft:1,opacity:0.7,display:"inline-flex"}}>{Li(isPendOpen?"chevron-up":"chevron-down",7,T.txt2)}</span>}
                </span>

                {/* Pending drill-down overlay */}
                {isPendOpen&&hasPend&&(
                  <div onClick={e=>e.stopPropagation()}
                    style={{position:"absolute",top:RH,left:0,width:Math.max(SW*2,150),zIndex:40,
                      background:T.surf,border:`1px solid ${T.bds}`,
                      borderRadius:"0 0 10px 10px",padding:"8px",boxShadow:"0 8px 24px rgba(0,0,0,0.6)"}}>
                    <div style={{color:T.txt2,fontSize:8,fontWeight:700,letterSpacing:0.5,marginBottom:3,textTransform:"uppercase"}}>
                      {sub==="M"?"Mitte":"Ende"} – Einzelbeträge
                    </div>
                    {pendItems.map(item=>(
                      <div key={item.txId} style={{marginBottom:3}}>
                        <div style={{color:"rgba(160,180,220,0.6)",fontSize:8,marginBottom:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.desc||"Vormerkung"}</div>
                        <input value={item.amount}
                          onChange={e=>setTxs(p=>p.map(t=>{
                            if(t.id!==item.txId)return t;
                            const v=pn(e.target.value);
                            return {...t,totalAmount:v,splits:(t.splits||[]).map(sp=>({...sp,amount:v}))};
                          }))}
                          inputMode="decimal"
                          style={{background:"rgba(255,255,255,0.06)",border:`1px solid ${T.bds}`,outline:"none",
                            color:T.txt,fontSize:10,fontFamily:NUM_FONT,fontWeight:700,textAlign:"right",
                            width:"100%",padding:"3px 6px",borderRadius:6,boxSizing:"border-box"}}
                        />
                      </div>
                    ))}
                    <div style={{borderTop:"1px solid rgba(61,126,170,0.15)",marginTop:4,paddingTop:4,display:"flex",justifyContent:"space-between"}}>
                      <span style={{color:T.txt2,fontSize:8}}>Σ</span>
                      <span style={{color:T.txt,fontSize:10,fontWeight:800,fontFamily:NUM_FONT}}>{fmt(pendItems.reduce((s,i)=>s+pn(i.amount),0))}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      );
    };

    return (
      <div style={{flex:1,minHeight:0,display:"flex",flexDirection:"column",background:T.bg,color:T.txt,position:"relative",overflow:"hidden"}}>

        {/* Popup editor */}
        {popup&&(
          <div onClick={()=>setPopup(null)}
            style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",backdropFilter:"blur(8px)",zIndex:60,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <div onClick={e=>e.stopPropagation()}
              style={{background:T.surf,borderRadius:18,padding:"14px 14px 12px",width:280,
                border:`1px solid ${T.bds}`,boxShadow:"0 8px 40px rgba(0,0,0,0.5),0 0 0 1px rgba(170,204,0,0.08)"}}>
              {/* Header */}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
                <div>
                  <div style={{color:T.txt2,fontSize:10,marginBottom:2}}>{popup.row?.label||""}</div>
                  <div style={{color:T.blue,fontSize:15,fontWeight:700}}>{popup.label}</div>
                </div>
                <button onClick={()=>setPopup(null)}
                  style={{background:"rgba(255,255,255,0.07)",border:"none",color:T.txt2,borderRadius:8,width:28,height:28,cursor:"pointer",fontSize:13,flexShrink:0}}>{Li("x",13)}</button>
              </div>
              {/* Current value display */}
              <div style={{background:"rgba(255,255,255,0.04)",borderRadius:12,padding:"7px 10px",marginBottom:14,border:"1px solid rgba(61,126,170,0.15)"}}>
                <div style={{color:T.txt2,fontSize:10,marginBottom:2}}>Aktueller Wert</div>
                <div style={{color:popup.sub==="D"?T.gold:T.txt,fontSize:22,fontWeight:800,fontFamily:NUM_FONT,textAlign:"right"}}>
                  {popup.val ? fmt(pn(popup.val)) : "–"}
                </div>
              </div>
              {/* Reset-Button wenn manuell überschrieben */}
              {(popup.sub==="M"||popup.sub==="E")&&popup.row?.type==="auto"&&popup.row?.subId&&(
                <div style={{background:"rgba(180,83,9,0.1)",border:"1px solid rgba(180,83,9,0.3)",borderRadius:10,padding:"8px 12px",marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}>
                  <div>
                    <div style={{color:T.override,fontSize:10,fontWeight:700,marginBottom:1}}>Manuell überschrieben</div>
                    <div style={{color:T.txt2,fontSize:10}}>Auto-Wert: <b style={{color:T.txt}}>{fmt(getActualSum(year, popup.mi, popup.row.subId, popup.sub)||0)}</b></div>
                  </div>
                  <button onClick={()=>{setJV(popup.mi,popup.id,popup.sub,"");setPopup(null);}}
                    style={{background:"`${T.override}26`",border:"1px solid `${T.override}66`",color:T.override,borderRadius:8,padding:"6px 12px",fontSize:12,cursor:"pointer",fontWeight:700,whiteSpace:"nowrap",flexShrink:0}}>
                    ↺ Auto wiederherstellen
                  </button>
                </div>
              )}
              {/* Input */}
              <input
                autoFocus
                value={popup.val}
                onChange={e=>setPopup(p=>({...p,val:e.target.value}))}
                onKeyDown={e=>{if(e.key==="Enter")commitPopup();if(e.key==="Escape")setPopup(null);}}
                inputMode="decimal"
                placeholder="0,00"
                style={{width:"100%",background:"rgba(170,204,0,0.08)",border:`1px solid ${T.bds}`,
                  borderRadius:11,padding:"13px 14px",color:T.txt,fontSize:18,fontWeight:700,
                  outline:"none",textAlign:"right",boxSizing:"border-box",fontFamily:NUM_FONT,
                  marginBottom:12}}
              />
              {/* Quick buttons */}
              <div style={{display:"flex",gap:6,marginBottom:12}}>
                {["0","50","100","250","500"].map(v=>(
                  <button key={v} onClick={()=>setPopup(p=>({...p,val:v}))}
                    style={{flex:1,padding:"5px 0",borderRadius:8,border:`1px solid ${T.bds}`,
                      background:"rgba(61,126,170,0.07)",color:T.txt2,fontSize:11,cursor:"pointer",fontWeight:600}}>
                    {v==="0"?"Leer":v}
                  </button>
                ))}
              </div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>{setPopup(p=>({...p,val:""}));setJV(popup.mi,popup.id,popup.sub,"");setPopup(null);}}
                  style={{flex:1,padding:"11px",borderRadius:11,border:"1px solid rgba(255,80,80,0.3)",
                    background:"rgba(224,80,96,0.08)",color:T.neg,fontSize:13,fontWeight:600,cursor:"pointer"}}>
                  Löschen
                </button>
                <button onClick={commitPopup}
                  style={{flex:2,padding:"11px",borderRadius:11,border:"none",
                    background:T.blue,color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer"}}>
                  Speichern
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Drilldown: Einzelbuchungen einer Summenzelle ── */}
        {drilldown&&(
          <div onClick={()=>setDrilldown(null)}
            style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",backdropFilter:"blur(8px)",
              zIndex:65,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
            <div onClick={e=>e.stopPropagation()}
              style={{background:T.surf2,borderRadius:20,width:"100%",maxWidth:480,
                maxHeight:"80vh",display:"flex",flexDirection:"column",
                border:`1px solid ${T.bds}`,boxShadow:"0 8px 40px rgba(0,0,0,0.7)"}}>
              {/* Header */}
              <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px 8px",flexShrink:0}}>
                <div style={{flex:1}}>
                  <div style={{color:T.blue,fontSize:15,fontWeight:700}}>{drilldown.label}</div>
                  <div style={{color:T.txt2,fontSize:11}}>
                    {(()=>{
                      const list = drilldown.txList||[];
                      const n = list.length;
                      if(drilldown.isSaldoRow) {
                        const real = list.filter(t=>!t.pending).reduce((s,t)=>s+t.totalAmount,0);
                        const pend = list.filter(t=>t.pending).reduce((s,t)=>s+t.totalAmount,0);
                        const base = drilldown.baseSaldo??0;
                        return `Anfang: ${fmt(base)} · Buchungen: ${fmt(real)} · Vormerkungen: ${fmt(pend)}`;
                      }
                      if(drilldown.isSumRow) {
                        const sum = list.reduce((s,t)=>s+t.totalAmount,0);
                        return `${n} Buchung${n!==1?"en":""} · Summe: ${fmt(Math.abs(sum))}`;
                      }
                      const sum = list.reduce((s,tx)=>{
                        const sp=(tx.splits||[]).find(sp=>sp.subId===drilldown.subId);
                        return s+(sp?pn(sp.amount):tx.totalAmount);
                      },0);
                      return `${n} Buchung${n!==1?"en":""} · Summe: ${fmt(sum)}`;
                    })()}
                  </div>
                </div>
                <button onClick={()=>setDrilldown(null)}
                  style={{background:"rgba(255,255,255,0.08)",border:"none",color:T.txt,
                    borderRadius:10,width:32,height:32,cursor:"pointer",fontSize:16}}>{Li("x",13)}</button>
              </div>
              {/* Reset-Banner wenn manuell überschrieben */}
              {drilldown.isOverride&&(
                <div style={{background:"rgba(180,83,9,0.1)",border:"1px solid rgba(180,83,9,0.3)",
                  borderRadius:10,margin:"0 12px 8px",padding:"8px 12px",
                  display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                  <div style={{flex:1}}>
                    <div style={{color:T.override,fontSize:10,fontWeight:700}}>Manuell überschrieben</div>
                    <div style={{color:T.txt2,fontSize:10}}>
                      Gespeichert: <b style={{color:T.override}}>{fmt(pn(drilldown.storedVal))}</b>
                      {" · "}Auto: <b style={{color:T.txt}}>{fmt(pn(drilldown.autoVal))}</b>
                    </div>
                  </div>
                  <button onClick={()=>{
                    setJV(drilldown.mi, drilldown.rowId, drilldown.sub, "");
                    setDrilldown(p=>({...p, isOverride:false}));
                  }} style={{background:"`${T.override}26`",border:"1px solid `${T.override}66`",
                    color:T.override,borderRadius:8,padding:"6px 10px",fontSize:11,
                    cursor:"pointer",fontWeight:700,whiteSpace:"nowrap",flexShrink:0}}>
                    ↺ Auto
                  </button>
                </div>
              )}
              {drilldown.linkPendId&&(
                <div style={{background:(isLightTheme())?"rgba(192,120,0,0.15)":"rgba(245,166,35,0.12)",border:`1px solid ${T.gold}44`,
                  borderRadius:10,margin:"0 12px 8px",padding:"8px 12px",
                  color:T.gold,fontSize:11,display:"flex",alignItems:"center",gap:8}}>
                  {Li("link",12,T.gold)}
                  <span style={{flex:1}}>Vormerkung ausgewählt — jetzt die zugehörige <b>echte Buchung</b> antippen zum Verknüpfen</span>
                  <button onClick={()=>setDrilldown(p=>({...p,linkPendId:null}))}
                    style={{background:"none",border:"none",color:T.gold,cursor:"pointer",fontSize:11,fontWeight:700}}>Abbrechen</button>
                </div>
              )}
              {/* Saldo-Aufstellung */}
              {drilldown.isSaldoRow&&(
                <div style={{padding:"8px 14px",background:"rgba(74,159,212,0.06)",
                  borderTop:`1px solid ${T.bd}`,flexShrink:0}}>
                  {(()=>{
                    const list=drilldown.txList||[];
                    const base=drilldown.baseSaldo??0;
                    const realTxs=list.filter(t=>!t.pending);
                    const pendTxs=list.filter(t=>t.pending);
                    const realSum=realTxs.reduce((s,t)=>s+t.totalAmount,0);
                    const pendSum=pendTxs.reduce((s,t)=>s+t.totalAmount,0);
                    const total=base+realSum+pendSum;
                    return (
                      <div style={{display:"flex",flexDirection:"column",gap:3}}>
                        {[
                          ["Anfangssaldo",base,"txt2"],
                          [`+ ${realTxs.length} Buchungen`,realSum,realSum>=0?"pos":"neg"],
                          pendTxs.length>0?[`+ ${pendTxs.length} Vormerkungen`,pendSum,"gold"]:null,
                          ["= Prognose-Saldo",total,total>=0?"pos":"neg"],
                        ].filter(Boolean).map(([label,val,col],i)=>(
                          <div key={i} style={{display:"flex",justifyContent:"space-between",
                            alignItems:"center",fontSize:10,
                            borderTop:i===3?`1px solid ${T.bds}`:undefined,
                            paddingTop:i===3?3:0}}>
                            <span style={{color:T.txt2}}>{label}</span>
                            <span style={{...amtStyle(col),fontFamily:NUM_FONT,fontWeight:i===3?700:400}}>
                              {val>=0?"+":"−"}{fmt(Math.abs(val))}
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}
              <div style={{borderTop:`1px solid ${T.bd}`,flex:1,overflowY:"auto"}}>
                {(drilldown.txList||[]).length===0?(
                  <div style={{padding:"24px 18px",color:T.txt2,fontSize:13,textAlign:"center"}}>
                    Keine Buchungen{drilldown.isSaldoRow?" / Vormerkungen":""} in diesem Zeitraum.
                  </div>
                ):(
                  groupBudgetPairs((drilldown.txList||[]).sort(drillSort)).map(tx=>{
                    // Budget-Paar: als einzelne Zeile
                    if(tx._isBudgetPair) {
                      const cat2=getCat((tx.splits||[])[0]?.catId);
                      const col2=T.neg;
                      return (
                        <div key={tx.id} style={{display:"flex",alignItems:"center",gap:10,
                          padding:"8px 14px",borderBottom:`1px solid ${T.bd}`,cursor:"pointer",
                          background:(isLightTheme())?"rgba(192,120,0,0.06)":"rgba(245,166,35,0.04)"}} onClick={()=>{setDrilldown(null);openEdit(tx);}}>
                          <div style={{width:36,height:36,borderRadius:11,flexShrink:0,
                            background:(cat2?.color||"#888")+"33",display:"flex",alignItems:"center",justifyContent:"center"}}>
                            {Li(cat2?.icon||"target",16,cat2?.color||T.gold)}
                          </div>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{color:T.txt,fontSize:12,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{tx.desc}</div>
                            <div style={{color:T.txt2,fontSize:10}}>{tx.date.slice(0,7)}</div>
                          </div>
                          <div style={{display:"flex",gap:8,alignItems:"center",flexShrink:0}}>
                            <span style={{color:T.mid,fontSize:10}}>Mitte</span>
                            <span style={{...amtStyle("neg",col2),fontSize:11,fontWeight:700,fontFamily:NUM_FONT}}>−{fmt(tx._mitteAmt)}</span>
                            <span style={{color:T.gold,fontSize:10}}>Gesamt</span>
                            <span style={{...amtStyle("neg",col2),fontSize:11,fontWeight:700,fontFamily:NUM_FONT}}>−{fmt(tx._mitteAmt+tx._endeAmt)}</span>
                          </div>
                        </div>
                      );
                    }
                    const sp  = drilldown.subId
                      ? (tx.splits||[]).find(s=>s.subId===drilldown.subId)
                      : (tx.splits||[])[0];
                    const cat = getCat(sp?.catId);
                    const sub = getSub(sp?.catId, sp?.subId);
                    const isS = (tx.splits||[]).length > 1;
                    const amt = drilldown.subId
                      ? (sp ? pn(sp.amount) : tx.totalAmount)
                      : tx.totalAmount;
                    const isSelectedPend = drilldown.linkPendId===tx.id;
                    const canLinkTo = drilldown.linkPendId && !tx.pending;

                    const handleClick = () => {
                      if(canLinkTo) {
                        // Verknüpfen: echte Buchung bekommt Vormerkung als linkedId
                        // Splits der Vormerkung auf die echte Buchung übertragen
                        const pendTx = txs.find(t=>t.id===drilldown.linkPendId);
                        const pendSplits = (pendTx?.splits||[]).filter(s=>s.catId);
                        const pendTotal  = pendSplits.reduce((s,sp)=>s+pn(sp.amount),0);
                        const newSplits  = pendSplits.length>0
                          ? pendSplits.map(sp=>({...sp, id:uid()}))
                          : tx.splits;
                        const amtMismatch2 = pendTotal>0 && Math.abs(pendTotal - tx.totalAmount) > 0.005;
                        setTxs(p=>p.map(t=>{
                          if(t.id===tx.id) return {...t, splits:newSplits, linkedIds:(t.linkedIds||[]).includes(drilldown.linkPendId)?(t.linkedIds||[]):[...(t.linkedIds||[]), drilldown.linkPendId],
                            _amtMismatch: amtMismatch2 ? {pendId:drilldown.linkPendId, pendAmt:pendTotal, realAmt:tx.totalAmount} : undefined};
                          if(t.id===drilldown.linkPendId) return {...t, pending:false, _linkedTo:tx.id, accountId:tx.accountId};
                          return t;
                        }));
                        setDrilldown(p=>({...p, linkPendId:null,
                          txList: p.txList.filter(t=>t.id!==drilldown.linkPendId)
                        }));
                        return;
                      }
                      if(tx.pending && !drilldown.linkPendId) {
                        // Vormerkung antippen → Link-Modus aktivieren
                        setDrilldown(p=>({...p, linkPendId:tx.id}));
                        return;
                      }
                      setDrilldown(null); openEdit(tx, true);
                    };

                    return (
                      <div key={tx.id}
                        onClick={handleClick}
                        style={{display:"flex",alignItems:"center",gap:10,padding:"8px 14px",
                          borderBottom:`1px solid ${T.bd}`,cursor:"pointer",
                          background:isSelectedPend?"rgba(245,166,35,0.15)":canLinkTo?"rgba(74,159,212,0.06)":tx.pending?"rgba(245,166,35,0.04)":"transparent",
                          border:isSelectedPend?`1px solid ${T.gold}`:canLinkTo?`1px solid ${T.blue}44`:"none",
                          borderRadius:isSelectedPend||canLinkTo?8:0}}>
                        {/* Icon */}
                        <div style={{width:36,height:36,borderRadius:11,flexShrink:0,
                          background:(cat?.color||"#888")+"33",display:"flex",alignItems:"center",
                          justifyContent:"center",fontSize:17}}>
                          {tx.pending ? (tx._seriesTyp==="finanzierung"?Li("credit-card",16,T.gold):tx._seriesId?Li("repeat",16,T.pos):Li("calendar",16,T.blue)) : Li(cat?.icon||"tag",16,cat?.color||T.txt2)||"?"}
                        </div>
                        {/* Text */}
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{color:T.txt,fontSize:12,fontWeight:600,
                            overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                            {tx.desc||cat?.name||"Buchung"}{tx.note&&<span title={tx.note} style={{marginLeft:3,display:"inline-flex"}}>{Li("sticky-note",9,T.gold)}</span>}
                          </div>
                          <div style={{color:T.txt2,fontSize:10,marginTop:1,display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                            <span>{tx.date}</span>
                            {tx.pending&&<span style={{background:(isLightTheme())?"rgba(192,120,0,0.18)":"rgba(245,166,35,0.15)",color:T.gold,
                              borderRadius:4,padding:"0 4px",fontSize:9,fontWeight:700}}>
                              {isSelectedPend?"✓ ausgewählt":"Vormerkung – antippen zum Verknüpfen"}
                            </span>}
                            {canLinkTo&&<span style={{background:"rgba(74,159,212,0.15)",color:T.blue,
                              borderRadius:4,padding:"0 4px",fontSize:9,fontWeight:700}}>antippen zum Verknüpfen</span>}
                            {isS&&<span style={{background:"rgba(137,196,244,0.15)",color:T.blue,
                              borderRadius:4,padding:"0 4px",fontSize:9,fontWeight:700}}>Split</span>}
                            <span style={{color:(cat?.color||T.txt2),fontSize:10}}>
                              {sub?.name||cat?.name||"unkategorisiert"}
                            </span>
                            {(tx.linkedIds||[]).map(lid=>{
                              const lt=txs.find(t=>t.id===lid);
                              if(!lt||lt.pending) return null;
                              const sTotal=lt._seriesTotal; const sIdx=lt._seriesIdx;
                              return (
                                <span key={lid} style={{display:"inline-flex",alignItems:"center",gap:3,
                                  background:"rgba(74,159,212,0.12)",border:`1px solid ${T.blue}33`,
                                  borderRadius:5,padding:"1px 5px",fontSize:9,color:T.blue}}>
                                  {Li("link",9,T.blue)}
                                  {lt.desc||"Vormerkung"}
                                  {sTotal>1&&` · ${sIdx}/${sTotal}`}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                        {/* Betrag */}
                        <div style={{textAlign:"right",flexShrink:0}}>
                          <div style={{...amtStyle(txType(tx)==="income"?"pos":"neg"),fontSize:13,fontWeight:700,fontFamily:NUM_FONT}}>
                            {txType(tx)==="income"?"+":"−"}{fmt(amt)}
                          </div>
                          {isS&&(
                            <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:1,marginTop:2}}>
                              <div style={{color:T.txt2,fontSize:9,fontFamily:NUM_FONT,whiteSpace:"nowrap"}}>
                                {Li("arrow-left-right",8,T.blue)} Gesamt: {fmt(tx.totalAmount)}
                              </div>
                              {(tx.splits||[]).filter(sp=>sp.catId&&sp.subId!==drilldown.subId).map(sp=>{
                                const oCat=getCat(sp.catId), oSub=getSub(sp.catId,sp.subId);
                                return (
                                  <div key={sp.id} style={{color:T.txt2,fontSize:9,fontFamily:NUM_FONT,whiteSpace:"nowrap"}}>
                                    <span style={{color:oCat?.color||T.txt2}}>{oSub?.name||oCat?.name||"?"}</span>: {fmt(pn(sp.amount))}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        {canLinkTo && <span style={{flexShrink:0}}>{Li("link",16,T.blue)}</span>}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* Filter-Toggle jetzt in der floating Bottom-Bar */}
        {/* ── Sticky header (outside scroll) ── */}
        <style>{`#jahres-header::-webkit-scrollbar { display:none; }`}</style>
        <div id="jahres-header" ref={headerScrollRef} onScroll={()=>syncScroll(headerScrollRef,dataScrollRef)} style={{overflowX:"auto",flexShrink:0,background:"#fff",scrollbarWidth:"none",msOverflowStyle:"none",position:"relative"}}>
        <div style={{minWidth:LW+showMonths.length*MW}}>
          <div style={{display:"flex",
            background:T.surf,
            borderBottom:`2px solid ${T.bds}`}}>
            <div style={{width:LW,minWidth:LW,height:HH,display:"flex",alignItems:"center",
              paddingLeft:10,borderRight:"1px solid #ddd",flexShrink:0,
              position:"sticky",left:0,zIndex:10,
              background:T.surf}}>
              <span style={{color:T.txt2,fontSize:9,fontWeight:700}}>Kategorie</span>
            </div>
            {showMonths.map(mi=>{
              const isCur = mi===curMonth && year===CUR_YEAR;
              return (
                <React.Fragment key={mi}>
                <div style={{width:2,minWidth:2,flexShrink:0,alignSelf:"stretch",background:T.bds}}/>
                <div style={{width:MW,minWidth:MW,height:HH,flexShrink:0,
                  background:isCur?"rgba(74,159,212,0.07)":"transparent",
                  borderTop:isCur?`2px solid ${T.blue}`:"2px solid transparent"}}>
                  <div style={{textAlign:"center",padding:"3px 0 1px",
                    color:isCur?T.blue:T.txt,
                    fontSize:11,fontWeight:isCur?800:600,
                    whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                    {MONTHS_F[mi]}
                  </div>
                  <div style={{display:"flex"}}>
                    {["M","E","D"].map(s=>(
                      <div key={s} style={{width:SW,textAlign:"center",fontSize:7,fontWeight:700,
                        color:s==="D"?T.blue:T.txt2,letterSpacing:0}}>
                        {subLabels[s]}
                      </div>
                    ))}
                  </div>
                </div>
                </React.Fragment>
              );
            })}
            <div style={{width:2,minWidth:2,flexShrink:0,alignSelf:"stretch",background:T.bds}}/>
          </div>
        </div></div>{/* end sticky header */}

        {/* ── Leer-Zustand ── */}
        {!hasSetup&&(
          <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12,padding:32,color:T.txt2}}>
            <div style={{marginBottom:4,opacity:0.4}}>{Li("calendar-range",40,T.txt2,1)}</div>
            <div style={{color:T.blue,fontSize:16,fontWeight:700,textAlign:"center"}}>Noch keine Kategorien</div>
            <div style={{fontSize:13,textAlign:"center",lineHeight:1.6}}>
              Lege zuerst unter <b style={{color:T.blue}}>Erfassen → Kategorien</b> deine Gruppen und Kategorien an.<br/>
              Danach erscheinen hier die Jahreszeilen automatisch.
            </div>
          </div>
        )}
        {/* ── Scrollable data rows ── */}
        <div ref={dataScrollRef} onScroll={()=>syncScroll(dataScrollRef,headerScrollRef)} style={{flex:1,minHeight:0,overflow:"auto",WebkitOverflowScrolling:"touch",position:"relative"}}
          onTouchStart={(!isLand||forceSingle)?onTS:undefined}
          onTouchEnd={(!isLand||forceSingle)?onTE:undefined}>
        <div style={{minWidth:LW+showMonths.length*MW}}>
          {jrows.filter(row=>{
            if(!hideEmptyRows) return true;
            if(row.type!=="auto"||!row.subId) return true; // Nur Sub-Zeilen filtern
            // Zeile anzeigen wenn min. ein Monat eine echte Buchung ODER eine Vormerkung hat
            return showMonths.some(mi=>{
              const d1 = txs.some(t=>{
                const d=new Date(t.date);
                return !t.pending&&!t._linkedTo&&d.getFullYear()===year&&d.getMonth()===mi
                  &&(t.splits||[]).some(sp=>sp.subId===row.subId);
              });
              if(d1) return true;
              // Auch Vormerkungen prüfen
              return txs.some(t=>{
                const d=new Date(t.date);
                return t.pending&&!t._linkedTo&&d.getFullYear()===year&&d.getMonth()===mi
                  &&(t.splits||[]).some(sp=>sp.subId===row.subId);
              });
            });
          }).map((row,ri)=>{
            const dgs = darkGs(row.block, row.type);
            const h = row.type==="header" ? HH : RH;
            const isHeader   = row.type==="header";
            const isResult   = row.type==="result";
            const isSubhead  = row.type==="subheader";
            const isHighlight= row.type==="highlight";

            if(!row.cols){
              return (
                <div key={row.id} style={{display:"flex",height:h,
                  background:T.surf,
                  borderBottom:`1px solid ${T.bd}`}}>
                  <div style={{width:LW,minWidth:LW,height:h,display:"flex",alignItems:"center",
                    position:"sticky",left:0,zIndex:2,
                    paddingLeft: isHeader ? 8 : 12,
                    background:T.surf,
                    borderRight:`1px solid ${T.bd}`,
                    borderBottom:`1px solid ${T.bd}`,
                    borderLeft:"none"}}>
                    <span style={{color:T.txt,fontSize:isHeader?11:10,fontWeight:700,
                      textTransform:isHeader?"uppercase":"none",letterSpacing:isHeader?0.8:0,
                      whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:LW-18}}>
                      {row.label}
                    </span>
                  </div>
                  {showMonths.map(mi=>(
                    <React.Fragment key={mi}>
                      <div style={{width:1,minWidth:1,flexShrink:0,alignSelf:"stretch",background:T.bd}}/>
                      <div style={{width:MW,minWidth:MW,height:h,background:"transparent"}}/>
                    </React.Fragment>
                  ))}
                  <div style={{width:2,minWidth:2,flexShrink:0,alignSelf:"stretch",background:"rgba(0,0,0,0.08)"}}/>
                </div>
              );
            }
            return (
              <div key={row.id} style={{display:"flex",height:RH,
                background:T.surf,
                borderBottom:`1px solid ${T.bd}`}}>
                <div style={{width:LW,minWidth:LW,height:RH,display:"flex",alignItems:"center",
                  position:"sticky",left:0,zIndex:2,
                  paddingLeft: isSubhead ? 10 : 16,
                  background:T.surf,
                  borderRight:`1px solid ${T.bd}`,
                  borderBottom:`1px solid ${T.bd}`,
                  boxSizing:"border-box",
                  borderLeft:"none"}}>
                  <span style={{
                    color: T.txt,
                    fontSize: isSubhead ? 10 : (row.id==="ein_head"||row.id==="aus_head") ? 11 : 9,
                    fontWeight: isResult||isHighlight||isSubhead||(row.id==="ein_head"||row.id==="aus_head") ? 700 : 400,
                    textTransform: (row.id==="ein_head"||row.id==="aus_head") ? "uppercase" : "none",
                    letterSpacing: (row.id==="ein_head"||row.id==="aus_head") ? 0.5 : 0,
                    whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:LW-22}}>
                    {row.label}
                  </span>
                </div>
                {showMonths.map(mi=>(
                  <React.Fragment key={mi}>
                    <div style={{width:2,minWidth:2,flexShrink:0,alignSelf:"stretch",background:T.bds}}/>
                    <VCell mi={mi} row={row}/>
                  </React.Fragment>
                ))}
                <div style={{width:2,minWidth:2,flexShrink:0,alignSelf:"stretch",background:T.bds}}/>
              </div>
            );
          })}
        </div></div>{/* end data scroll */}

        {/* Legend + Toggle */}
        <div style={{padding:"4px 12px 6px",display:"flex",gap:8,flexWrap:"wrap",alignItems:"center",
          borderTop:`1px solid ${T.bds}`,background:T.bg}}>
          <button onClick={()=>setHideEmptyRows(v=>!v)}
            style={{display:"flex",alignItems:"center",gap:5,background:"transparent",
              border:`1px solid ${hideEmptyRows?T.pos:T.bds}`,borderRadius:7,
              padding:"2px 8px",color:hideEmptyRows?T.pos:T.lbl||T.txt2,
              fontSize:9,fontWeight:hideEmptyRows?700:400,cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>
            {Li(hideEmptyRows?"eye":"eye-off",9,hideEmptyRows?T.pos:T.lbl||T.txt2)}
            {hideEmptyRows?"nur genutzte Kategorien":"alle Kategorien"}
          </button>
          <span style={{color:T.lbl||T.txt2,fontSize:9}}>M = Buchungen 1–14 · E = alle · {col3Name} = aktuell</span>
          <span style={{color:T.lbl||T.txt2,fontSize:9,opacity:0.6}}>░ schraffiert = Ende ≠ {col3Name} · <span style={{color:T.override}}>amber</span> = manuell überschrieben (Zelle anklicken → ↺ Auto zum Zurücksetzen)</span>
        </div>
      </div>
    );

}

// ══════════════════════════════════════════════════════════════════════

export { JahrScreen };
