// Auto-generated module (siehe app-src.jsx)

import React, { useContext } from "react";
import { CatPicker } from "../molecules/CatPicker.jsx";
import { VerknuepfenPanel } from "./VerknuepfenPanel.jsx";
import { AppCtx } from "../../state/AppContext.js";
import { theme as T } from "../../theme/activeTheme.js";
import { INP } from "../../theme/palette.js";
import { isoAddMonths } from "../../utils/date.js";
import { fmt, pn, uid, NUM_FONT } from "../../utils/format.js";
import { Li } from "../../utils/icons.jsx";

function EditPopup() {
  const { cats,setCats,groups,setGroups,txs,setTxs,accounts,setAccounts,
    yearData,setYearData,year,setYear,month,setMonth,isLand,
    col3Name,setCol3Name,modal,setModal,mgmtCat,setMgmtCat,
    editTx,setEditTx,newTx,setNewTx,newCat,setNewCat,
    newSubName,setNewSubName,exportModal,setExportModal,
    getCat,getSub,txType,getActualSum,getTotalIncome,getTotalExpense,getPendingSum,pendingItemsFor,
    getJV,setJV,getMV,setMV,getAcc,openEdit,saveEdit,deleteFromEdit,
    updEditSplit,moveCat,moveSub,updateSub,updateCat,
    renameCat,renameSub,deleteCat,deleteSub,saveNewCat,saveNewSub,
    moveAcc, accIconPick, setAccIconPick,
    addSplit,removeSplit,updSplit,splitTotal,splitDiff,txValid,saveTx,
    onTS,onTE,
    setShowVormHub, setEditVormTx,
  } = useContext(AppCtx);

    if(!editTx) return null;
    const isMulti = (editTx.splits||[]).length > 1;
    const editSplitTotal = (editTx.splits||[]).reduce((s,sp)=>s+pn(sp.amount),0);
    const diff = pn(editTx.totalAmount) - editSplitTotal;
    // Flexibler Topf "Unvorhergesehenes" (per Name erkannt). Schalter nur bei
    // Ausgaben anzeigen und nicht, wenn die Buchung selbst im Topf liegt.
    const _potSub = (()=>{
      for(const c of (cats||[])) for(const s of (c.subs||[]))
        if((s.name||"").trim().toLowerCase()==="unvorhergesehenes") return s;
      return null;
    })();
    const _showPotToggle = !editTx._budgetSubId && _potSub && txType(editTx)==="expense"
      && (editTx.splits||[])[0]?.subId !== _potSub.id;
    return (
      <div onClick={()=>setEditTx(null)}
        style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",backdropFilter:"blur(8px)",zIndex:80,display:"flex",alignItems:"center",justifyContent:"center"}}>
        <div onClick={e=>e.stopPropagation()}
          style={{background:T.surf,borderRadius:20,padding:"20px 18px",width:"100%",maxWidth:480,
            border:`1px solid ${T.bds}`,boxShadow:"0 8px 40px rgba(0,0,0,0.5),0 0 0 1px rgba(170,204,0,0.08)",maxHeight:"85vh",overflowY:"auto"}}>
          <div style={{width:36,height:4,borderRadius:2,background:T.blue+"44",margin:"0 auto 16px"}}/>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <div style={{color:T.blue,fontSize:16,fontWeight:700}}>
              {editTx.pending ? "vormerkung bearbeiten" : "buchung bearbeiten"}
            </div>
            <button onClick={()=>setEditTx(null)} style={{background:"rgba(255,255,255,0.07)",border:"none",color:"#888",borderRadius:8,width:28,height:28,cursor:"pointer",fontSize:13}}>{Li("x",13)}</button>
          </div>
          {/* Verknüpfte Vormerkung — Info-Box für echte Buchungen */}
          {!editTx.pending&&(editTx.linkedIds||[]).length>0&&(()=>{
            const linkedPends = (editTx.linkedIds||[])
              .map(id=>txs.find(t=>t.id===id))
              .filter(t=>t); // alle verknüpften, egal ob noch pending oder bereits abgebucht
            if(linkedPends.length===0) return null;
            return linkedPends.map(pend=>{
              const seriesTxs = pend._seriesId
                ? txs.filter(t=>t._seriesId===pend._seriesId).sort((a,b)=>a.date.localeCompare(b.date))
                : [];
              const thisIdx = seriesTxs.findIndex(t=>t.id===pend.id);
              const total = seriesTxs.length;
              const totalAmt = seriesTxs.reduce((s,t)=>s+t.totalAmount,0);
              const paid = seriesTxs.filter(t=>!t.pending&&t._linkedTo).length;
              const open = seriesTxs.filter(t=>t.pending).length;
              const paidAmt = seriesTxs.filter(t=>!t.pending&&t._linkedTo).reduce((s,t)=>s+t.totalAmount,0);
              const openAmt = seriesTxs.filter(t=>t.pending).reduce((s,t)=>s+t.totalAmount,0);
              return (
                <div key={pend.id} style={{background:"rgba(74,159,212,0.08)",border:`1px solid ${T.blue}33`,
                  borderRadius:11,padding:"10px 12px",marginBottom:12}}>
                  {/* Header */}
                  <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
                    {Li("link",12,T.blue)}
                    <span style={{color:T.blue,fontSize:11,fontWeight:700}}>Verknüpfte Vormerkung</span>
                    {total>1&&pend._seriesIdx&&pend._seriesTyp==="finanzierung"&&<span style={{color:T.gold,fontSize:10,background:(T.themeName==="light"||T.themeName==="ios"||T.themeName==="material"||T.themeName==="paper"||T.themeName==="dkb"||T.themeName==="sand"||T.themeName==="clean"||T.themeName==="brutalist"||T.themeName==="swiss")?"rgba(192,120,0,0.15)":"rgba(245,166,35,0.12)",
                      borderRadius:4,padding:"1px 6px",fontWeight:700,marginLeft:"auto"}}>
                      {Li("repeat",9,T.gold)} Zahlung {thisIdx+1} von {total}
                    </span>}
                    <button onClick={()=>{
                      // Alle Verknüpfungen lösen — auch einzelne Vormerkungen ohne Serie
                      const seriesPendIds = seriesTxs.length > 0
                        ? new Set(seriesTxs.map(t=>t.id))
                        : new Set([pend.id]);
                      setTxs(p=>p.map(t=>{
                        // Echte Buchungen: linkedIds bereinigen, Splits restaurieren
                        if(!t.pending && (t.linkedIds||[]).some(id=>seriesPendIds.has(id))) {
                          const newLinkedIds = (t.linkedIds||[]).filter(x=>!seriesPendIds.has(x));
                          const isLastUnlink = newLinkedIds.length===0;
                          if(isLastUnlink && t._splitsBeforeLink) {
                            const { _splitsBeforeLink, ...rest } = t;
                            return { ...rest, linkedIds: newLinkedIds, splits: _splitsBeforeLink };
                          }
                          return { ...t, linkedIds: newLinkedIds };
                        }
                        // Vormerkungen: wieder auf pending setzen
                        if(seriesPendIds.has(t.id)) return {...t, pending:true, _linkedTo:null};
                        return t;
                      }));
                      setEditTx(p=>{
                        const newLinkedIds = (p.linkedIds||[]).filter(x=>!seriesPendIds.has(x));
                        const isLastUnlink = newLinkedIds.length===0;
                        if(isLastUnlink && p._splitsBeforeLink) {
                          const { _splitsBeforeLink, ...rest } = p;
                          return { ...rest, linkedIds: newLinkedIds, splits: _splitsBeforeLink };
                        }
                        return { ...p, linkedIds: newLinkedIds };
                      });
                    }} style={{marginLeft: total>1?"4px":"auto",background:"rgba(234,64,37,0.12)",border:`1px solid ${T.neg}33`,
                      borderRadius:6,padding:"2px 7px",color:T.neg,fontSize:10,cursor:"pointer",
                      display:"flex",alignItems:"center",gap:3,fontFamily:"inherit"}}>
                      {Li("unlink",10,T.neg)} Alle entknüpfen
                    </button>
                  </div>
                  {/* Beschreibung + Notiz */}
                  {pend.desc&&<div style={{color:T.txt,fontSize:12,fontWeight:600,marginBottom:2}}>{pend.desc}</div>}
                  {pend.note&&<div style={{color:T.txt2,fontSize:11,marginBottom:6}}>{pend.note}</div>}

                </div>
              );
            });
          })()}
          {/* Betrag-Abweichungs-Warnung */}
          {editTx._amtMismatch&&(()=>{
            const mm = editTx._amtMismatch;
            const pend = txs.find(t=>t.id===mm.pendId);
            return (
              <div style={{background:"rgba(245,166,35,0.10)",border:`1px solid ${T.gold}55`,
                borderRadius:11,padding:"10px 12px",marginBottom:12,
                display:"flex",alignItems:"flex-start",gap:8}}>
                {Li("alert-triangle",14,T.gold)}
                <div style={{flex:1}}>
                  <div style={{color:T.gold,fontSize:12,fontWeight:700,marginBottom:3}}>
                    Betrag stimmt nicht überein
                  </div>
                  <div style={{color:T.txt2,fontSize:11,lineHeight:1.5}}>
                    Vormerkung: <b style={{color:T.txt}}>{fmt(mm.pendAmt)}</b>
                    {" · "}Buchung: <b style={{color:T.txt}}>{fmt(mm.realAmt)}</b>
                    {" · "}Differenz: <b style={{color:T.neg}}>{fmt(Math.abs(mm.pendAmt-mm.realAmt))}</b>
                  </div>
                  {pend&&<button onClick={()=>{ setEditTx(null); setTimeout(()=>setEditTx(pend),50); }}
                    style={{marginTop:6,background:(T.themeName==="light"||T.themeName==="ios"||T.themeName==="material"||T.themeName==="paper"||T.themeName==="dkb"||T.themeName==="sand"||T.themeName==="clean"||T.themeName==="brutalist"||T.themeName==="swiss")?"rgba(192,120,0,0.18)":"rgba(245,166,35,0.15)",border:`1px solid ${T.gold}44`,
                      color:T.gold,borderRadius:7,padding:"4px 10px",fontSize:10,fontWeight:700,
                      cursor:"pointer",display:"flex",alignItems:"center",gap:4,fontFamily:"inherit"}}>
                    {Li("edit",10,T.gold)} Vormerkung bearbeiten
                  </button>}
                </div>
              </div>
            );
          })()}
          {/* Zahlungsart */}
          <div style={{color:T.txt2,fontSize:11,marginBottom:6}}>Zahlungsart</div>
          <div style={{display:"flex",gap:6,marginBottom:12}}>
            {accounts.map(acc=>{
              const sel = editTx.accountId===acc.id;
              return (
                <button key={acc.id} onClick={()=>{
                  const d = new Date(editTx.date);
                  d.setDate(d.getDate()+acc.delayDays);
                  setEditTx(p=>({...p, accountId:acc.id,
                    pendingDate: acc.delayDays>0 ? d.toISOString().split("T")[0] : "",
                    pending: acc.delayDays>0 ? true : p.pending,
                  }));
                }}
                  style={{flex:1,padding:"8px 4px",borderRadius:10,border:`2px solid ${sel?acc.color:"transparent"}`,
                    cursor:"pointer",fontSize:11,fontWeight:700,textAlign:"center",
                    background:sel?acc.color+"22":"rgba(255,255,255,0.04)",
                    color:sel?acc.color:T.txt2}}>
                  <div style={{fontSize:16,marginBottom:2}}>{Li(acc.icon,18,sel?acc.color:T.txt2)}</div>
                  <div style={{fontSize:10,fontWeight:700,whiteSpace:"nowrap"}}>{acc.name}{acc.delayDays>0&&<span style={{color:T.gold,fontSize:"0.8em",fontWeight:700,marginLeft:2}}>+{acc.delayDays}d</span>}</div>
                </button>
              );
            })}
          </div>
          {/* Umbuchung: Zielkonto wählen — bei Vormerkungen UND bei Serien-Buchungen
              (damit man bestehende Wiederkehrende nachträglich um Umbuchung ergänzen kann) */}
          {(editTx.pending || editTx._seriesId) && accounts.length>1 && (()=>{
            const targets = accounts.filter(a=>a.id!==editTx.accountId);
            const isExpense = (editTx.totalAmount<0) || (editTx._csvType==="expense");
            if(!isExpense) return null; // nur für Ausgaben
            return (
              <div style={{marginBottom:12,padding:"10px 12px",
                background:"rgba(74,159,212,0.08)",border:`1px solid ${editTx._transferTo?"#4A9FD4":T.bd}`,
                borderRadius:10}}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
                  {Li("arrow-right-left",12,"#4A9FD4")}
                  <span style={{color:T.txt2,fontSize:11,fontWeight:700}}>Umbuchung auf eigenes Konto</span>
                  {editTx._transferTo&&(
                    <button onClick={()=>setEditTx(p=>({...p, _transferTo:null}))}
                      style={{marginLeft:"auto",background:"none",border:"none",color:T.txt2,cursor:"pointer",fontSize:10,padding:"2px 6px"}}>
                      Entfernen
                    </button>
                  )}
                </div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {targets.map(tgt=>{
                    const sel = editTx._transferTo===tgt.id;
                    return (
                      <button key={tgt.id} onClick={()=>setEditTx(p=>({...p, _transferTo: sel?null:tgt.id}))}
                        style={{flex:"1 1 100px",padding:"6px 10px",borderRadius:8,
                          border:`1.5px solid ${sel?tgt.color:T.bd}`,
                          background:sel?tgt.color+"22":"rgba(255,255,255,0.04)",
                          color:sel?tgt.color:T.txt2,fontSize:11,fontWeight:600,cursor:"pointer",
                          display:"flex",alignItems:"center",gap:5,fontFamily:"inherit"}}>
                        {Li(tgt.icon,12,sel?tgt.color:T.txt2)}
                        {tgt.name}
                      </button>
                    );
                  })}
                </div>
                {editTx._transferTo&&(()=>{
                  // Zielkategorie auswählen (Income/Tagesgeld-Kategorien)
                  const tgtCats = (cats||[]).filter(c=>c.type==="income"||c.type==="tagesgeld");
                  const tgtCat = tgtCats.find(c=>c.id===editTx._transferToCatId);
                  const tgtSubs = tgtCat?.subs||[];
                  return (
                    <div style={{marginTop:8,paddingTop:8,borderTop:`1px solid rgba(74,159,212,0.2)`}}>
                      <div style={{color:T.txt2,fontSize:10,fontWeight:700,marginBottom:4}}>Zielkategorie (auf Zielkonto)</div>
                      <div style={{display:"flex",gap:6}}>
                        <select value={editTx._transferToCatId||""}
                          onChange={e=>setEditTx(p=>({...p, _transferToCatId:e.target.value, _transferToSubId:""}))}
                          style={{flex:1,padding:"5px 8px",borderRadius:7,border:`1px solid ${T.bd}`,
                            background:"rgba(255,255,255,0.04)",color:T.txt,fontSize:11,fontFamily:"inherit",outline:"none"}}>
                          <option value="">— Hauptkategorie —</option>
                          {tgtCats.map(c=>(<option key={c.id} value={c.id}>{c.name}</option>))}
                        </select>
                        <select value={editTx._transferToSubId||""} disabled={!tgtSubs.length}
                          onChange={e=>setEditTx(p=>({...p, _transferToSubId:e.target.value}))}
                          style={{flex:1,padding:"5px 8px",borderRadius:7,border:`1px solid ${T.bd}`,
                            background:"rgba(255,255,255,0.04)",color:T.txt,fontSize:11,fontFamily:"inherit",outline:"none",
                            opacity:tgtSubs.length?1:0.5}}>
                          <option value="">— Unterkategorie —</option>
                          {tgtSubs.map(s=>(<option key={s.id} value={s.id}>{s.name}</option>))}
                        </select>
                      </div>
                    </div>
                  );
                })()}
                {editTx._transferTo&&(
                  <div style={{color:T.txt2,fontSize:9,marginTop:6,fontStyle:"italic"}}>
                    Beim Speichern wird automatisch eine verknüpfte Eingangsbuchung auf dem Zielkonto angelegt.
                  </div>
                )}
              </div>
            );
          })()}
          {getAcc(editTx.accountId).delayDays>0&&(
            <div style={{background:"rgba(255,213,128,0.07)",border:"1px solid rgba(255,213,128,0.25)",borderRadius:11,padding:"10px 13px",marginBottom:12}}>
              <div style={{color:T.gold,fontSize:11,fontWeight:700,marginBottom:6}}>
                <span style={{display:"inline-flex",alignItems:"center",gap:4}}>{Li("clock",11,T.gold)}Abbuchung vom Giro-Konto vorgemerkt</span>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{color:T.txt2,fontSize:11,flexShrink:0}}>Fällig am:</div>
                <input type="date" value={editTx.pendingDate}
                  onChange={e=>setEditTx(p=>({...p,pendingDate:e.target.value}))}
                  style={{flex:1,background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,213,128,0.3)",
                    borderRadius:8,padding:"7px 10px",color:T.gold,fontSize:13,outline:"none",colorScheme:"dark"}}/>
              </div>
              <div style={{color:T.txt2,fontSize:10,marginTop:5}}>
                Wird automatisch als Vormerkung für das Abbuchungsdatum angelegt.
              </div>
            </div>
          )}
          {/* Beschreibung */}
          <div style={{color:T.txt2,fontSize:11,marginBottom:2}}>Beschreibung</div>
          <input value={editTx.desc} onChange={e=>setEditTx(p=>({...p,desc:e.target.value}))}
            placeholder="z. B. Gehalt, Miete …"
            style={{width:"100%",background:"rgba(255,255,255,0.06)",border:`1px solid ${T.bds}`,
              borderRadius:11,padding:"6px 10px",color:T.txt,fontSize:14,outline:"none",boxSizing:"border-box",marginBottom:8}}/>
          {/* Verursachungsdatum (nur bei Vormerkungen) */}
          {editTx.pending&&!editTx._budgetSubId&&(
            <div style={{marginBottom:8}}>
              <div style={{color:T.txt2,fontSize:11,marginBottom:2,
                display:"flex",alignItems:"center",gap:4}}>
                {Li("calendar",11,T.txt2)} Verursachungsdatum (optional)
              </div>
              <div style={{display:"flex",gap:4,alignItems:"center"}}>
                <input type="date" value={editTx.valueDate||""}
                  onChange={e=>setEditTx(p=>({...p,valueDate:e.target.value||undefined}))}
                  style={{...INP,marginBottom:0,flex:1,
                    colorScheme:(T.themeName==="light"||T.themeName==="ios"||T.themeName==="material"||T.themeName==="paper"||T.themeName==="dkb"||T.themeName==="sand"||T.themeName==="clean"||T.themeName==="brutalist"||T.themeName==="swiss")?"light":"dark"}}/>
                {editTx.valueDate&&(
                  <button onClick={()=>setEditTx(p=>{const u={...p};delete u.valueDate;return u;})}
                    style={{background:"none",border:"none",color:T.txt2,cursor:"pointer",padding:4}}>
                    {Li("x",11)}
                  </button>
                )}
              </div>
            </div>
          )}
          {/* Notiz */}
          <div style={{color:T.txt2,fontSize:11,marginBottom:2,display:"flex",alignItems:"center",gap:4}}>
            {Li("sticky-note",11,T.gold)} Notiz
          </div>
          <textarea value={editTx.note||""} onChange={e=>setEditTx(p=>({...p,note:e.target.value}))}
            placeholder="Eigene Bemerkung zur Buchung…"
            rows={2}
            style={{width:"100%",background:"rgba(255,255,255,0.04)",border:`1px solid ${editTx.note?T.gold+"66":T.bd}`,
              borderRadius:11,padding:"6px 10px",color:T.txt,fontSize:13,outline:"none",
              boxSizing:"border-box",marginBottom:12,resize:"vertical",fontFamily:"inherit",
              lineHeight:1.5}}/>
          {/* Datum + Betrag */}
          {editTx.pending&&!editTx._seriesId&&!editTx._budgetSubId&&(
            <div style={{marginBottom:10}}>
              <div style={{color:T.txt2,fontSize:11,marginBottom:4}}>Anzahl Monate (Wiederholung)</div>
              <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                {[1,2,3,6,12,24].map(n=>(
                  <button key={n} onClick={()=>setEditTx(p=>({...p,repeatMonths:n}))}
                    style={{flex:1,padding:"6px 0",borderRadius:8,
                      border:`1.5px solid ${(editTx.repeatMonths||1)===n?T.gold:T.bd}`,
                      background:(editTx.repeatMonths||1)===n?"rgba(245,213,128,0.15)":"transparent",
                      color:(editTx.repeatMonths||1)===n?T.gold:T.txt2,
                      fontSize:12,fontWeight:700,cursor:"pointer",minWidth:32}}>{n}</button>
                ))}
                <input
                  defaultValue=""
                  onChange={e=>{
                    const v=parseInt(e.target.value);
                    if(v>0) setEditTx(p=>({...p,repeatMonths:v}));
                  }}
                  placeholder="…"
                  inputMode="numeric"
                  style={{width:50,background:"rgba(255,255,255,0.06)",
                    border:`1.5px solid ${![1,2,3,6,12,24].includes(editTx.repeatMonths||1)?T.gold:T.bd}`,
                    borderRadius:8,padding:"5px 6px",color:T.txt,fontSize:12,textAlign:"center",outline:"none",fontWeight:700}}/>
              </div>
            </div>
          )}
          <div style={{display:"flex",gap:10,marginBottom:12}}>
            <div style={{flex:1}}>
              <div style={{color:T.txt2,fontSize:11,marginBottom:2}}>Datum</div>
              <input type="date" value={editTx.date||""} onChange={e=>setEditTx(p=>({...p,date:e.target.value}))}
                style={{width:"100%",background:"rgba(255,255,255,0.06)",border:`1px solid ${T.bds}`,
                  borderRadius:11,padding:"11px 10px",color:T.txt,fontSize:13,outline:"none",
                  boxSizing:"border-box",colorScheme:"dark"}}/>
            </div>
            {!editTx._budgetSubId&&(
            <div style={{flex:1}}>
              <div style={{color:T.txt2,fontSize:11,marginBottom:2}}>Betrag (€)</div>
              {editTx._readOnlyAmount&&(
                <div style={{background:"rgba(74,159,212,0.08)",border:`1px solid ${T.blue}44`,
                  borderRadius:9,padding:"6px 10px",marginBottom:6,
                  color:T.txt2,fontSize:10,lineHeight:1.5}}>
                  <span style={{display:"inline-flex",alignItems:"center",gap:4}}>{Li("lock",12,T.blue)}Betrag gesperrt</span> – nur Kategorie &amp; Split änderbar
                </div>
              )}
              <input value={editTx.totalAmount}
                readOnly={!!editTx._readOnlyAmount}
                onChange={e=>!editTx._readOnlyAmount&&setEditTx(p=>({...p,totalAmount:e.target.value,splits:(p.splits||[]).length===1?p.splits.map(sp=>({...sp,amount:e.target.value})):p.splits}))}
                style={{opacity:editTx._readOnlyAmount?0.5:1,width:"100%",background:"rgba(255,255,255,0.06)",border:`1px solid ${T.bds}`,
                  borderRadius:11,padding:"6px 10px",color:T.txt,fontSize:14,fontWeight:700,
                  fontFamily:NUM_FONT,textAlign:"right",outline:"none",boxSizing:"border-box"}}
                inputMode="decimal" placeholder="0,00"/>
            </div>)}
          </div>
          {/* Splits */}
          <div style={{color:T.txt2,fontSize:11,marginBottom:6}}>Kategorie{isMulti?" & Aufteilung":""}</div>
          {isMulti&&(
            <div style={{background:"rgba(74,159,212,0.08)",border:`1px solid ${T.blue}33`,
              borderRadius:10,padding:"8px 12px",marginBottom:10,
              display:"flex",alignItems:"flex-start",gap:8}}>
              {Li("arrow-left-right",13,T.blue)}
              <div style={{flex:1}}>
                <div style={{color:T.blue,fontSize:11,fontWeight:700,marginBottom:4}}>Splitbuchung · Gesamtbetrag {fmt(pn(editTx.totalAmount))}</div>
                <div style={{display:"flex",flexDirection:"column",gap:3}}>
                  {(editTx.splits||[]).map((sp,si)=>{
                    const spCat=getCat(sp.catId), spSub=getSub(sp.catId,sp.subId);
                    return (
                      <div key={sp.id} style={{display:"flex",alignItems:"center",gap:6}}>
                        <span style={{width:7,height:7,borderRadius:"50%",background:spCat?.color||T.txt2,flexShrink:0,display:"inline-block"}}/>
                        <span style={{color:spCat?.color||T.txt2,fontSize:11,fontWeight:700,fontFamily:NUM_FONT,minWidth:52,textAlign:"right"}}>{fmt(pn(sp.amount))}</span>
                        <span style={{color:T.txt2,fontSize:10}}>{spSub?.name||spCat?.name||<span style={{color:"rgba(255,255,255,0.3)"}}>unkategorisiert</span>}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          {(editTx.splits||[]).map((sp)=>{
            const spCat=getCat(sp.catId), spSubs=spCat?.subs||[];
            // Verknüpfte Vormerkung für diesen Split ermitteln (via editTx.linkedIds)
            const linkedPend = (editTx.linkedIds||[]).length===1
              ? txs.find(t=>t.id===(editTx.linkedIds||[])[0])
              : null;
            const splitCat = null;
            const splitSub = null;

            const doUnlinkSplit = () => {
              const pendId = (editTx.linkedIds||[])[0];
              // Beim Entknüpfen Original-Splits wiederherstellen (falls vorhanden),
              // sonst auf leer zurücksetzen.
              const restore = editTx._splitsBeforeLink && editTx._splitsBeforeLink.length>0
                ? editTx._splitsBeforeLink
                : [{id:uid(), catId:"", subId:"", amount:editTx.totalAmount}];
              setTxs(p=>p.map(t=>{
                if(t.id===editTx.id) {
                  const { _splitsBeforeLink, ...rest } = t;
                  return {
                    ...rest,
                    splits: restore,
                    linkedIds: (t.linkedIds||[]).filter(x=>x!==pendId),
                    _amtMismatch: undefined,
                  };
                }
                if(t.id===pendId) return {...t, pending:true, _linkedTo:null};
                return t;
              }));
              setEditTx(p=>{
                const { _splitsBeforeLink, ...rest } = p;
                return {
                  ...rest,
                  splits: restore,
                  linkedIds: (p.linkedIds||[]).filter(x=>x!==pendId),
                  _amtMismatch: undefined,
                };
              });
            };

            return (
              <div key={sp.id} style={{background:"rgba(255,255,255,0.04)",borderRadius:11,padding:"10px 12px",marginBottom:8,border:`1px solid ${T.bd}`}}>
                {/* Split-Link-Badge: zeigt verknüpfte Vormerkung */}
                {linkedPend&&(editTx.splits||[]).length>1&&(
                  <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6,
                    background:"rgba(74,159,212,0.07)",borderRadius:7,padding:"4px 8px"}}>
                    {Li("link",10,T.blue)}
                    <span style={{color:T.blue,fontSize:10,flex:1,fontWeight:600}}>
                      {linkedPend.desc||"Vormerkung"}
                      {splitSub||splitCat
                        ? <span style={{color:T.txt2,fontWeight:400}}> · {splitSub?.name||splitCat?.name}</span>
                        : null}
                    </span>
                    <button onClick={doUnlinkSplit}
                      title="nur diesen Split entknüpfen"
                      style={{background:"rgba(234,64,37,0.12)",border:`1px solid ${T.neg}33`,
                        color:T.neg,borderRadius:5,padding:"2px 6px",fontSize:9,
                        cursor:"pointer",display:"flex",alignItems:"center",gap:3,
                        fontFamily:"inherit",whiteSpace:"nowrap",flexShrink:0}}>
                      {Li("unlink",9,T.neg)} entknüpfen
                    </button>
                  </div>
                )}
                <div style={{display:"flex",gap:8,marginBottom:isMulti?8:0}}>
                  <div style={{flex:1}}>
                    <CatPicker
                      value={sp.catId+"|"+sp.subId}
                      onChange={(catId,subId)=>{ updEditSplit(sp.id,"catId",catId); updEditSplit(sp.id,"subId",subId); }}
                      totalAmount={pn(editTx.totalAmount)}
                      onSplit={(newSplits)=>setEditTx(p=>({...p,splits:newSplits.map(s=>({...s,id:s.id||uid()}))}))}
                      filterType={(()=>{
                        // 1. _csvType hat Vorrang (aus CSV-Import)
                        if(editTx._csvType) return editTx._csvType;
                        // 2. Bereits gewählte Kategorie beibehalten
                        if(sp.catId) { const c=getCat(sp.catId); if(c) return (c.type==="income"||c.type==="tagesgeld")?"income":"expense"; }
                        // 3. Vorzeichen des Betrags
                        return pn(editTx.totalAmount)<0?"expense":"income";
                      })()}
                    />
                  </div>
                </div>
                {isMulti&&(
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <input value={sp.amount} readOnly={!!editTx._readOnlyAmount} onChange={e=>!editTx._readOnlyAmount&&updEditSplit(sp.id,"amount",e.target.value)} style={{opacity:editTx._readOnlyAmount?0.5:1,flex:1,background:"rgba(255,255,255,0.06)",border:`1px solid ${T.bd}`,borderRadius:8,
                        padding:"6px 8px",color:T.txt,fontSize:13,fontFamily:NUM_FONT,textAlign:"right",outline:"none"}}
                      inputMode="decimal" placeholder="0,00"/>
                    <button onClick={()=>setEditTx(p=>({...p,splits:p.splits.filter(s=>s.id!==sp.id)}))}
                      style={{background:"rgba(224,80,96,0.12)",border:"1px solid rgba(239,68,68,0.25)",color:T.neg,borderRadius:7,width:28,height:28,cursor:"pointer",fontSize:14,flexShrink:0}}>−</button>
                  </div>
                )}
              </div>
            );
          })}
          {isMulti&&(
            <div style={{textAlign:"right",marginBottom:10}}>
              <span style={{color:Math.abs(diff)<0.01?T.pos:T.neg,fontSize:12,fontFamily:NUM_FONT,fontWeight:700}}>
                {(()=>{const d=Math.round(diff*100)/100; return `Diff: ${d>0?"+":d<0?"−":""}${fmt(Math.abs(d))}`;})()}
              </span>
            </div>
          )}
          {/* Vormerkung toggle - nicht für Budget-Platzhalter */}
          {!editTx._budgetSubId&&(<div style={{background:"rgba(255,255,255,0.04)",borderRadius:11,padding:"6px 10px",marginBottom:editTx.pending?8:16}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{color:T.txt,fontSize:13}}>Als Vormerkung</span>
              <div onClick={()=>setEditTx(p=>({...p,pending:!p.pending}))}
                style={{width:44,height:26,borderRadius:13,background:editTx.pending?T.gold:"rgba(255,255,255,0.1)",cursor:"pointer",position:"relative",transition:"background 0.2s"}}>
                <div style={{position:"absolute",top:3,left:editTx.pending?21:3,width:20,height:20,borderRadius:"50%",background:"#fff",transition:"left 0.2s",boxShadow:"0 1px 4px rgba(0,0,0,0.3)"}}/>
              </div>
            </div>
            {editTx.pending&&(
              <div style={{marginTop:8}}>
                <div style={{color:T.txt2,fontSize:11,marginBottom:4}}>Vorgemerkter Betrag (€)</div>
                <input value={editTx.totalAmount}
                  onChange={e=>setEditTx(p=>({...p,totalAmount:e.target.value}))}
                  style={{width:"100%",background:"rgba(255,255,255,0.06)",border:`1px solid ${T.gold}66`,
                    borderRadius:9,padding:"8px 10px",color:T.txt,fontSize:14,fontWeight:700,
                    fontFamily:NUM_FONT,textAlign:"right",outline:"none",boxSizing:"border-box"}}
                  inputMode="decimal" placeholder="0,00"/>
              </div>
            )}
          </div>)}
          {/* Flexibler Topf: diese Buchung aus dem Unvorhergesehenes-Budget bezahlen.
              Kategorie/Betrag bleiben unverändert; nur die Budget-Anrechnung wandert
              in den Topf. */}
          {_showPotToggle&&(<div style={{background:"rgba(255,255,255,0.04)",borderRadius:11,padding:"6px 10px",marginBottom:16}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{color:T.txt,fontSize:13}}>aus Unvorhergesehenes</span>
              <div onClick={()=>setEditTx(p=>({...p,_potSubId:p._potSubId?undefined:_potSub.id}))}
                style={{width:44,height:26,borderRadius:13,background:editTx._potSubId?T.gold:"rgba(255,255,255,0.1)",cursor:"pointer",position:"relative",transition:"background 0.2s"}}>
                <div style={{position:"absolute",top:3,left:editTx._potSubId?21:3,width:20,height:20,borderRadius:"50%",background:"#fff",transition:"left 0.2s",boxShadow:"0 1px 4px rgba(0,0,0,0.3)"}}/>
              </div>
            </div>
            <div style={{color:T.txt2,fontSize:10,marginTop:5,lineHeight:1.35}}>
              Betrag bleibt in dieser Kategorie, wird aber vom Unvorhergesehenes-Budget abgezogen.
            </div>
          </div>)}
          {/* Budget-Platzhalter: Betrag editierbar + Toggle zum Lösen der Budget-Bindung */}
          {editTx._budgetSubId&&editTx.pending&&(()=>{
            // Mitte/Ende-Paar erkennen
            const isMitte = editTx._budgetSubId.endsWith("_mitte");
            const endeSubId = isMitte ? editTx._budgetSubId.slice(0,-6) : editTx._budgetSubId;
            const mitteSubId = endeSubId+"_mitte";
            const [ey,em] = editTx.date.split("-");
            const mittePartner = txs.find(t=>t._budgetSubId===mitteSubId&&t.pending&&t.date.startsWith(`${ey}-${em}`));
            const endePartner  = txs.find(t=>t._budgetSubId===endeSubId &&t.pending&&t.date.startsWith(`${ey}-${em}`)&&t.id!==editTx.id);
            const hasPair = !!(mittePartner||endePartner);
            const mitteAmt = isMitte ? pn(editTx.totalAmount) : (mittePartner?mittePartner.totalAmount:0);
            const endeAmt  = isMitte ? (endePartner?endePartner.totalAmount:0) : pn(editTx.totalAmount);
            const gesamtAmt = mitteAmt + endeAmt;
            return (
            <div style={{background:(T.themeName==="light"||T.themeName==="ios"||T.themeName==="material"||T.themeName==="paper"||T.themeName==="dkb"||T.themeName==="sand"||T.themeName==="clean"||T.themeName==="brutalist"||T.themeName==="swiss")?"rgba(192,120,0,0.08)":"rgba(245,166,35,0.06)",borderRadius:11,padding:"6px 10px",marginBottom:8,border:`1px solid ${T.gold}33`}}>
              <div style={{color:T.gold,fontSize:11,fontWeight:700,marginBottom:6,display:"flex",alignItems:"center",gap:5}}>
                {Li("target",11,T.gold)} Budget-Platzhalter
                <span style={{color:T.txt2,fontSize:10,fontWeight:400,marginLeft:4}}>— Budget-Bindung lösen?</span>
                <div onClick={()=>{
                  const sid = editTx._seriesId;
                  const bid = editTx._budgetSubId;
                  if(!window.confirm("Budget-Bindung für alle Zahlungen dieser Serie lösen?\nDie Vormerkungen bleiben erhalten, sind dann aber keine Budget-Platzhalter mehr.")) return;
                  setTxs(p=>p.map(t=>{
                    if(sid ? t._seriesId===sid : t._budgetSubId===bid&&t.pending) {
                      const u = {...t, _budgetSubId:undefined}; delete u._budgetSubId; return u;
                    }
                    return t;
                  }));
                  setEditTx(p=>{const u={...p,_budgetSubId:undefined}; delete u._budgetSubId; return u;});
                }}
                  style={{marginLeft:"auto",background:"rgba(234,64,37,0.12)",border:`1px solid ${T.neg}33`,
                    color:T.neg,borderRadius:6,padding:"2px 8px",fontSize:10,cursor:"pointer",
                    display:"flex",alignItems:"center",gap:3,fontFamily:"inherit",fontWeight:700}}>
                  {Li("unlink",9,T.neg)} Lösen
                </div>
              </div>
              {hasPair ? (
                <>
                  <div style={{display:"flex",gap:8,marginBottom:4}}>
                    <div style={{flex:1}}>
                      <div style={{color:T.txt2,fontSize:10,marginBottom:3}}>Budget bis Mitte (€)</div>
                      <input value={isMitte ? editTx.totalAmount : (mittePartner?String(mittePartner.totalAmount).replace(".",","):"")}
                        onChange={e=>{
                          const v=e.target.value;
                          if(isMitte) {
                            setEditTx(p=>({...p,totalAmount:v,splits:(p.splits||[]).map((sp,i)=>i===0?{...sp,amount:v}:sp)}));
                          } else if(mittePartner) {
                            setTxs(p=>p.map(t=>t.id===mittePartner.id?{...t,totalAmount:pn(v),splits:(t.splits||[]).map((sp,i)=>i===0?{...sp,amount:pn(v)}:sp)}:t));
                          }
                        }}
                        style={{width:"100%",background:"rgba(255,255,255,0.06)",border:`1px solid ${T.gold}44`,
                          borderRadius:8,padding:"6px 8px",color:T.mid,fontSize:13,fontWeight:700,
                          fontFamily:NUM_FONT,textAlign:"right",outline:"none",boxSizing:"border-box"}}
                        inputMode="decimal" placeholder="0,00"/>
                    </div>
                    <div style={{flex:1}}>
                      <div style={{color:T.txt2,fontSize:10,marginBottom:3}}>Budget bis Ende / Gesamt (€)</div>
                      <input
                        key={!isMitte ? editTx.id+"_ende" : endePartner?.id+"_gesamt"}
                        defaultValue={!isMitte
                          ? String(pn(editTx.totalAmount)+mitteAmt).replace(".",",")
                          : (endePartner?String(pn(endePartner.totalAmount)+mitteAmt).replace(".",","):"")}
                        onBlur={e=>{
                          const gesamt=pn(e.target.value);
                          const mitte=isMitte?pn(editTx.totalAmount):(mittePartner?mittePartner.totalAmount:0);
                          const neuesEnde=Math.max(0,gesamt-mitte);
                          if(!isMitte) {
                            setEditTx(p=>({...p,totalAmount:String(neuesEnde).replace(".",","),splits:(p.splits||[]).map((sp,i)=>i===0?{...sp,amount:neuesEnde}:sp)}));
                          } else if(endePartner) {
                            setTxs(p=>p.map(t=>t.id===endePartner.id?{...t,totalAmount:neuesEnde,splits:(t.splits||[]).map((sp,i)=>i===0?{...sp,amount:neuesEnde}:sp)}:t));
                          }
                        }}
                        style={{width:"100%",background:"rgba(255,255,255,0.06)",border:`1px solid ${T.gold}44`,
                          borderRadius:8,padding:"6px 8px",color:T.gold,fontSize:13,fontWeight:700,
                          fontFamily:NUM_FONT,textAlign:"right",outline:"none",boxSizing:"border-box"}}
                        inputMode="decimal" placeholder="0,00"/>
                    </div>
                  </div>
                  <div style={{color:T.txt2,fontSize:9,textAlign:"right"}}>
                    2. Hälfte: <b style={{color:T.gold}}>{fmt(Math.max(0,gesamtAmt-mitteAmt))}</b>
                    {" · "}Gesamt: <b style={{color:T.gold}}>{fmt(gesamtAmt)}</b>
                  </div>
                </>
              ) : (
                <>
                  <div style={{color:T.txt2,fontSize:11,marginBottom:4}}>Betrag (€)</div>
                  <input value={editTx.totalAmount}
                    onChange={e=>setEditTx(p=>({...p,totalAmount:e.target.value,splits:(p.splits||[]).map((sp,i)=>i===0?{...sp,amount:e.target.value}:sp)}))}
                    style={{width:"100%",background:"rgba(255,255,255,0.06)",border:`1px solid ${T.gold}66`,
                      borderRadius:9,padding:"8px 10px",color:T.txt,fontSize:14,fontWeight:700,
                      fontFamily:NUM_FONT,textAlign:"right",outline:"none",boxSizing:"border-box"}}
                    inputMode="decimal" placeholder="0,00"/>
                </>
              )}
            </div>
            );
          })()}
          {/* Serien-Info */}
          {editTx._seriesId&&(()=>{
            const seriesTxs = txs.filter(t=>t._seriesId===editTx._seriesId).sort((a,b)=>a.date.localeCompare(b.date));
            const thisIdx = seriesTxs.findIndex(t=>t.id===editTx.id);
            const total = seriesTxs.length;
            const totalAmt = seriesTxs.reduce((s,t)=>s+t.totalAmount,0);
            const startDate = seriesTxs[0]?.date||"";
            const endDate = seriesTxs[total-1]?.date||"";
            return (
              <div style={{background:"rgba(245,166,35,0.08)",border:`1px solid ${T.gold}44`,borderRadius:12,
                padding:"10px 12px",marginBottom:12}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                  {Li("repeat",13,T.gold)}
                  <div style={{flex:1}}>
                    <span style={{color:T.gold,fontSize:12,fontWeight:700}}>
                      {editTx._seriesTyp==="finanzierung"&&editTx._seriesIdx&&editTx._seriesTotal
                        ? `Rate ${thisIdx+1} von ${total}`
                        : "Wiederkehrende Zahlung"}
                    </span>
                    <span style={{color:T.txt2,fontSize:10,marginLeft:8}}>
                      {total} Buchungen in der Serie
                    </span>
                  </div>
                  {/* x/y nur bei Finanzierungen anzeigen (typ==="finanzierung") */}
                  {editTx._seriesTyp==="finanzierung"&&editTx._seriesIdx&&editTx._seriesTotal&&(
                    <span style={{color:T.gold,fontSize:10,fontWeight:700,
                      background:"rgba(245,166,35,0.15)",borderRadius:5,padding:"2px 7px"}}>
                      {thisIdx+1}/{total}
                    </span>
                  )}
                </div>
                {/* Gesamtbetrag-Eingabe wenn Finanzierung */}
                {(editTx._seriesTyp==="finanzierung"&&editTx._seriesIdx&&editTx._seriesTotal)&&(
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,
                    background:(T.themeName==="light"||T.themeName==="ios"||T.themeName==="material"||T.themeName==="paper"||T.themeName==="dkb"||T.themeName==="sand"||T.themeName==="clean"||T.themeName==="brutalist"||T.themeName==="swiss")?"rgba(192,120,0,0.08)":"rgba(245,166,35,0.06)",borderRadius:8,padding:"7px 10px",
                    border:`1px solid ${T.gold}33`}}>
                    <span style={{color:T.txt2,fontSize:11,flex:1}}>Gesamtbetrag Serie</span>
                    <input
                      value={String(Math.round(totalAmt*100)/100).replace(".",",")}
                      readOnly
                      style={{width:90,background:"rgba(255,255,255,0.06)",border:`1px solid ${T.bds}`,
                        borderRadius:7,padding:"4px 8px",color:T.gold,fontSize:12,fontWeight:700,
                        fontFamily:NUM_FONT,textAlign:"right",outline:"none"}}/>
                    <span style={{color:T.txt2,fontSize:10}}>€</span>
                  </div>
                )}
                {/* Offener Restbetrag — nur wenn x/y aktiv */}
                {(editTx._seriesTyp==="finanzierung"&&editTx._seriesIdx&&editTx._seriesTotal)&&(()=>{
                  const paid = seriesTxs.filter(t=>!t.pending&&t._linkedTo).length;
                  const open = seriesTxs.filter(t=>t.pending).length;
                  const paidAmt = seriesTxs.filter(t=>!t.pending&&t._linkedTo).reduce((s,t)=>s+t.totalAmount,0);
                  const openAmt = seriesTxs.filter(t=>t.pending).reduce((s,t)=>s+t.totalAmount,0);
                  if(paid===0 && open===0) return null;
                  return (
                    <div style={{display:"flex",gap:6,marginBottom:8,flexWrap:"wrap"}}>
                      {paid>0&&<div style={{flex:1,background:"rgba(170,204,0,0.08)",border:`1px solid ${T.pos}33`,
                        borderRadius:8,padding:"5px 8px",textAlign:"center"}}>
                        <div style={{color:T.pos,fontSize:10,fontWeight:700}}>{paid} bezahlt</div>
                        <div style={{color:T.pos,fontSize:11,fontWeight:700,fontFamily:NUM_FONT}}>{fmt(paidAmt)}</div>
                      </div>}
                      {open>0&&<div style={{flex:1,background:"rgba(234,64,37,0.08)",border:`1px solid ${T.neg}33`,
                        borderRadius:8,padding:"5px 8px",textAlign:"center"}}>
                        <div style={{color:T.neg,fontSize:10,fontWeight:700}}>{open} offen</div>
                        <div style={{color:T.neg,fontSize:11,fontWeight:700,fontFamily:NUM_FONT}}>{fmt(openAmt)}</div>
                      </div>}
                    </div>
                  );
                })()}
                {/* Serie komplett bearbeiten */}
                <div style={{display:"flex",gap:6,marginBottom:6,alignItems:"flex-end"}}>
                  <div style={{flex:1}}>
                    <div style={{color:T.txt2,fontSize:10,marginBottom:3}}>Startdatum Serie</div>
                    <input type="date" defaultValue={startDate}
                      id={`series-start-${editTx._seriesId}`}
                      style={{width:"100%",background:"rgba(255,255,255,0.06)",border:`1px solid ${T.gold}44`,
                        borderRadius:8,padding:"6px 8px",color:T.txt,fontSize:11,outline:"none",
                        boxSizing:"border-box",colorScheme:"dark"}}/>
                  </div>
                  <div style={{flex:"0 0 70px"}}>
                    <div style={{color:T.txt2,fontSize:10,marginBottom:3}}>Anzahl</div>
                    <input type="number" min="1" max="360" defaultValue={total}
                      id={`series-count-${editTx._seriesId}`}
                      style={{width:"100%",background:"rgba(255,255,255,0.06)",border:`1px solid ${T.gold}44`,
                        borderRadius:8,padding:"6px 8px",color:T.txt,fontSize:11,outline:"none",
                        boxSizing:"border-box",textAlign:"center"}}/>
                  </div>
                  <button onClick={()=>{
                    const newStart = document.getElementById(`series-start-${editTx._seriesId}`)?.value;
                    const newCount = parseInt(document.getElementById(`series-count-${editTx._seriesId}`)?.value)||total;
                    if(!newStart) return;
                    // Neue Serie aufbauen: Startdatum + Anzahl, Tag aus neuem Startdatum
                    setTxs(prevTxs=>{
                      const rebuilt = Array.from({length:newCount},(_,i)=>{
                        const newDate = isoAddMonths(newStart, i);
                        return {
                          id: i < seriesTxs.length ? seriesTxs[i].id : "pend-"+uid(),
                          desc: seriesTxs[0].desc, note: seriesTxs[0].note||"",
                          totalAmount: seriesTxs[0].totalAmount,
                          date: newDate, pending: true,
                          accountId: seriesTxs[0].accountId,
                          splits: (seriesTxs[0].splits||[]).map(s=>({...s,id:uid()})),
                          _seriesId: editTx._seriesId,
                          _seriesIdx: i+1, _seriesTotal: newCount,
                          _csvType: seriesTxs[0]._csvType||"expense",
                          ...(editTx._seriesTyp?{_seriesTyp:editTx._seriesTyp}:{}),
                        };
                      });
                      // changedTxIds/deletedTxIds nur in SupaDupa Money verfügbar — hier nicht nötig
                      return [...prevTxs.filter(t=>t._seriesId!==editTx._seriesId),...rebuilt];
                    });
                    setEditTx(null);
                  }} style={{padding:"6px 10px",borderRadius:8,border:"none",
                    background:T.gold,color:"#000",fontSize:11,fontWeight:700,
                    cursor:"pointer",fontFamily:"inherit",flexShrink:0,whiteSpace:"nowrap"}}>
                    {Li("check",11,"#000")} Serie neu aufbauen
                  </button>
                </div>
                <div style={{color:T.txt2,fontSize:9,lineHeight:1.4}}>
                  Enddatum: <b style={{color:T.txt}}>{endDate ? endDate.split("-").reverse().join(".") : "—"}</b> · Ändere Startdatum oder Anzahl und klicke „Serie neu aufbauen"
                </div>
              </div>
            );
          })()}
          <div style={{display:"flex",flexDirection:"column",gap:6,marginTop:4}}>
            {/* Speichern */}
            {editTx?.pending && (editTx?._seriesId || editTx?._budgetSubId) ? (<>
              <div style={{color:T.gold,fontSize:10,fontWeight:700,textAlign:"center"}}>Welche Vormerkungen speichern?</div>
              <div style={{display:"flex",gap:4}}>
                <button onClick={()=>saveEdit("single")}
                  style={{flex:1,padding:"9px 4px",borderRadius:10,border:`1px solid ${T.gold}44`,
                    background:"rgba(245,166,35,0.1)",color:T.gold,fontSize:11,fontWeight:700,
                    cursor:"pointer",fontFamily:"inherit"}}>
                  {Li("check",11,T.gold)} Nur diese
                </button>
                <button onClick={()=>saveEdit("from")}
                  style={{flex:1,padding:"9px 4px",borderRadius:10,border:`1px solid ${T.blue}44`,
                    background:"rgba(74,159,212,0.1)",color:T.blue,fontSize:11,fontWeight:700,
                    cursor:"pointer",fontFamily:"inherit"}}>
                  {Li("check",11,T.blue)} Ab dieser
                </button>
                <button onClick={()=>saveEdit("all")}
                  style={{flex:1,padding:"9px 4px",borderRadius:10,border:"none",
                    background:T.blue,color:"#fff",fontSize:11,fontWeight:700,
                    cursor:"pointer",fontFamily:"inherit"}}>
                  {Li("check",11,"#fff")} Alle
                </button>
              </div>
            </>) : (
              <button onClick={()=>saveEdit("single")}
                style={{padding:"11px",borderRadius:12,border:"none",
                  background:T.blue,color:T.on_accent,fontSize:14,fontWeight:700,
                  cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6,
                  fontFamily:"inherit"}}>
                {Li("check",15,T.on_accent)} Speichern
              </button>
            )}
            {/* Löschen */}
            {editTx?.pending && (editTx?._seriesId || editTx?._budgetSubId) ? (<>
              <div style={{color:T.neg,fontSize:10,fontWeight:700,textAlign:"center",marginTop:4}}>Welche Vormerkungen löschen?</div>
              <div style={{display:"flex",gap:4}}>
                <button onClick={()=>{ setTxs(p=>p.filter(x=>x.id!==editTx.id)); setEditTx(null); }}
                  style={{flex:1,padding:"8px 4px",borderRadius:10,border:`1px solid ${T.neg}44`,
                    background:`${T.neg}10`,color:T.neg,fontSize:11,fontWeight:700,
                    cursor:"pointer",fontFamily:"inherit"}}>
                  {Li("trash-2",11,T.neg)} Nur diese
                </button>
                <button onClick={()=>{
                  const sid=editTx._seriesId, bid=editTx._budgetSubId, thisDate=editTx.date;
                  setTxs(p=>p.filter(t=>!((sid?t._seriesId===sid:t._budgetSubId===bid) && t.pending && t.date>=thisDate)));
                  setEditTx(null);
                }} style={{flex:1,padding:"8px 4px",borderRadius:10,border:`1px solid ${T.neg}44`,
                    background:`${T.neg}10`,color:T.neg,fontSize:11,fontWeight:700,
                    cursor:"pointer",fontFamily:"inherit"}}>
                  {Li("trash-2",11,T.neg)} Ab dieser
                </button>
                <button onClick={()=>{
                  const sid=editTx._seriesId, bid=editTx._budgetSubId;
                  setTxs(p=>p.filter(t=>sid ? t._seriesId!==sid : !(t._budgetSubId===bid&&t.pending)));
                  setEditTx(null);
                }} style={{flex:1,padding:"8px 4px",borderRadius:10,border:`1px solid ${T.neg}44`,
                    background:`${T.neg}18`,color:T.neg,fontSize:11,fontWeight:700,
                    cursor:"pointer",fontFamily:"inherit"}}>
                  {Li("trash-2",11,T.neg)} Alle
                </button>
              </div>
            </>) : (
              <button onClick={deleteFromEdit}
                style={{padding:"11px",borderRadius:12,border:`1px solid ${T.neg}44`,
                  background:`${T.neg}12`,color:T.neg,fontSize:13,fontWeight:700,
                  cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6,
                  fontFamily:"inherit"}}>
                {Li("trash-2",14,T.neg)} Löschen
              </button>
            )}

            {/* ── Verknüpfen: Buchung ↔ Vormerkung ── */}
            {editTx&&<VerknuepfenPanel editTx={editTx} txs={txs} setTxs={setTxs} setEditTx={setEditTx} setShowVormHub={setShowVormHub} setEditVormTx={setEditVormTx}/>}

            {/* Als Vormerkung anlegen — nur für echte Buchungen */}
            {!editTx?.pending&&(
              <button onClick={()=>{
                const split=(editTx.splits||[])[0];
                setEditVormTx({
                  _prefill:true,
                  desc:editTx.desc||"",
                  totalAmount:editTx.totalAmount,
                  _csvType:editTx._csvType||"expense",
                  date:editTx.date,
                  accountId:editTx.accountId||"",
                  splits:split?.catId?[{...split,id:uid()}]:[],
                });
                setShowVormHub(true);
                setEditTx(null);
              }}
                style={{padding:"10px",borderRadius:12,
                  border:`1px solid ${T.gold}44`,
                  background:`${T.gold}08`,color:T.gold,
                  fontSize:13,fontWeight:700,cursor:"pointer",
                  display:"flex",alignItems:"center",justifyContent:"center",gap:8,
                  fontFamily:"inherit",marginTop:4}}>
                {Li("calendar-plus",15,T.gold)} Im Vormerkungsdialog öffnen
              </button>
            )}
          </div>
        </div>
      </div>
    );

}

export { EditPopup };
