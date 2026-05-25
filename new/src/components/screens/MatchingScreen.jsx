// Auto-generated module (siehe app-src.jsx)

import React, { useContext, useState } from "react";
import { CatPicker } from "../molecules/CatPicker.jsx";
import { MonthPicker } from "../molecules/MonthPicker.jsx";
import { QuickBtnsBar } from "../molecules/QuickBtnsBar.jsx";
import { AppCtx } from "../../state/AppContext.js";
import { theme as T } from "../../theme/activeTheme.js";
import { isoAddMonths } from "../../utils/date.js";
import { fmt, pn, uid } from "../../utils/format.js";
import { Li } from "../../utils/icons.jsx";
import { matchAmount, matchSearch } from "../../utils/search.js";

function MatchingScreen({onClose}) {
  const { cats, groups, txs, setTxs, accounts, year, month, getCat, getSub, txType } = useContext(AppCtx);

  const [selMonth,  setSelMonth]  = useState(month);
  const [selYear,   setSelYear]   = useState(year);
  const [selPend,   setSelPend]   = useState(null);  // gewählte Vormerkung
  const [selTx,     setSelTx]     = useState(null);  // gewählte Buchung
  const [matched,   setMatched]   = useState([]);    // [{pendId, txId}]
  const [showNewPend,  setShowNewPend]  = useState(false);
  const [newPend,      setNewPend]      = useState({
    desc:"", amount:"", catId:"", subId:"", accountId:"",
    date:`${selYear}-${String(selMonth+1).padStart(2,"0")}-01`,
    repeatMonths:1, csvType:"expense",
  });

  // Vormerkungen des gewählten Monats
  const pendingTxs = txs.filter(tx=>{
    if(!tx.pending) return false;
    const d=new Date(tx.date);
    return d.getFullYear()===selYear && d.getMonth()===selMonth;
  });

  // Echte (nicht-pending) Buchungen des Monats
  // Buchungen die bereits vollständig einer Vormerkung zugeordnet sind ausblenden
  const realTxs = txs.filter(tx=>{
    if(tx.pending) return false;
    if(tx._linkedTo) return false; // vollständig verknüpft
    const d=new Date(tx.date);
    return d.getFullYear()===selYear && d.getMonth()===selMonth;
  });

  // Noch nicht zugeordnete Buchungen (unkategorisiert oder manuell ausgewählt)
  const matchedTxIds  = new Set(matched.map(m=>m.txId));
  const matchedPendIds= new Set(matched.map(m=>m.pendId));
  const unmatchedTxs  = realTxs.filter(tx=>!matchedTxIds.has(tx.id));
  const unmatchedPends= pendingTxs.filter(p=>!matchedPendIds.has(p.id));

  const [searchPend, setSearchPend] = useState("");
  const [searchTx,   setSearchTx]   = useState("");
  const [matchAmt,   setMatchAmt]   = useState(false); // Betrag-Match-Toggle

  const filteredPends = unmatchedPends.filter(t=>{
    if(!searchPend) return true;
    const isAmt = /^[+\-=<>]?[\d.,]+$/.test(searchPend.trim());
    return isAmt ? matchAmount(Math.abs(t.totalAmount), searchPend.replace(/^[+\-]/,"")) : matchSearch(t.desc, searchPend);
  });
  const selectedPendAmt = matchAmt && selPend
    ? Math.abs(txs.find(t=>t.id===selPend)?.totalAmount||0) : null;
  const filteredTxs = unmatchedTxs.filter(t=>{
    // Betrag-Match-Filter: nur Buchungen mit ähnlichem Betrag
    if(selectedPendAmt !== null) {
      const diff = Math.abs(Math.abs(t.totalAmount) - selectedPendAmt);
      const pct  = selectedPendAmt > 0 ? diff / selectedPendAmt : diff;
      if(pct > 0.05 && diff > 0.10) return false; // max 5% oder 10ct Abweichung
    }
    if(!searchTx) return true;
    const isAmt = /^[+\-=<>]?[\d.,]+$/.test(searchTx.trim());
    return isAmt ? matchAmount(Math.abs(t.totalAmount), searchTx.replace(/^[+\-]/,"")) : matchSearch(t.desc, searchTx);
  });

  const doMatch = () => {
    if(!selPend||!selTx) return;
    const pend = txs.find(t=>t.id===selPend);
    const real = txs.find(t=>t.id===selTx);
    if(!pend||!real) return;
    // Beschreibung: Vormerkung-Beschreibung als Notiz anhängen wenn vorhanden
    // Bereits vorhandene Vormerkungsnotizen aus real.note entfernen um Dopplungen zu vermeiden
    const cleanRealNote = (real.note||"").split(" · ")
      .filter(part => !part.startsWith("Vormerkung:"))
      .join(" · ");
    const vormNote = pend.desc && pend.desc!==real.desc ? `Vormerkung: ${pend.desc}` : "";
    const combinedNote = [vormNote, pend.note||"", cleanRealNote]
      .filter(Boolean).join(" · ") || cleanRealNote || "";
    // Splits der Vormerkung 1:1 übernehmen — keine Skalierung
    const pendSplits = (pend.splits||[]).filter(s=>s.catId);
    const pendTotal  = pendSplits.reduce((s,sp)=>s+pn(sp.amount),0);
    const newSplits  = pendSplits.length>0
      ? pendSplits.map(sp=>({...sp, id:uid()}))
      : real.splits;
    // Warnung wenn Beträge abweichen — wird im UI gezeigt, aber Zuordnung trotzdem durchführen
    const amtMismatch = pendTotal>0 && Math.abs(pendTotal - real.totalAmount) > 0.005;
    setTxs(p=>p.map(tx=>{
      if(tx.id===selTx) return {
        ...tx,
        splits: newSplits,
        linkedIds: (tx.linkedIds||[]).includes(selPend) ? (tx.linkedIds||[]) : [...(tx.linkedIds||[]), selPend],
        note: combinedNote,
        _amtMismatch: amtMismatch ? {pendId:selPend, pendAmt:pendTotal, realAmt:real.totalAmount} : undefined,
      };
      if(tx.id===selPend) return {
        ...tx, pending:false, _linkedTo: selTx,
      };
      return tx;
    }));
    setMatched(p=>[...p,{pendId:selPend,txId:selTx}]);
    setSelPend(null); setSelTx(null);
  };

  const addNewPending = () => {
    if(!newPend.amount||!newPend.catId) return;
    const months = Math.max(1, parseInt(newPend.repeatMonths)||1);
    const seriesId = months > 1 ? "series-"+uid() : null;
    const newTxs = [];
    for(let i=0;i<months;i++){
      const isoDate = isoAddMonths(newPend.date, i);
      newTxs.push({
        id:"pend-"+uid(), date:isoDate,
        desc:newPend.desc||"Vormerkung",
        totalAmount:pn(newPend.amount), pending:true,
        _csvType: newPend.csvType||"expense",
        accountId:newPend.accountId||"",
        splits:[{id:uid(),catId:newPend.catId,subId:newPend.subId,amount:pn(newPend.amount)}],
        ...(seriesId ? {_seriesId:seriesId, _seriesIdx:i+1, _seriesTotal:months} : {}),
      });
    }
    setTxs(p=>[...p,...newTxs]);
    setNewPend({desc:"",amount:"",catId:"",subId:"",accountId:"",
      date:`${selYear}-${String(selMonth+1).padStart(2,"0")}-01`,repeatMonths:1});
    setShowNewPend(false);
  };

  const rowS = (active, color) => ({
    display:"flex",alignItems:"center",gap:8,padding:"8px 12px",
    borderRadius:10,marginBottom:4,cursor:"pointer",
    border:`1.5px solid ${active?color:T.bd}`,
    background:active?color+"18":"rgba(255,255,255,0.03)",
  });

  return (
    <div style={{position:"fixed",inset:0,background:T.bg,zIndex:15,display:"flex",
      flexDirection:"column",fontFamily:"'SF Pro Text',-apple-system,sans-serif"}}>
      {/* Header */}
      <div style={{background:T.surf,borderBottom:`1px solid ${T.bds}`,
        padding:"10px 14px",display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
        <button onClick={onClose}
          style={{background:"rgba(255,255,255,0.08)",border:"none",color:T.txt,
            borderRadius:9,width:32,height:32,cursor:"pointer",fontSize:16}}>{Li("arrow-left",13)}</button>
        <div style={{flex:1}}>
          <div style={{color:T.blue,fontSize:15,fontWeight:700}}><span style={{display:"flex",alignItems:"center",gap:6}}>{Li("arrow-left-right",15)}Vormerkungen zuordnen</span></div>
          <div style={{color:T.txt2,fontSize:10}}>Buchungen mit Vormerkungen verknüpfen</div>
        </div>
        {/* Monat/Jahr Wähler */}
        <MonthPicker month={selMonth} year={selYear}
          onMonth={setSelMonth} onYear={setSelYear} size="sm"/>
      </div>

      {/* Anleitung */}
      <div style={{padding:"8px 14px",background:"rgba(74,159,212,0.06)",
        borderBottom:`1px solid ${T.bd}`,flexShrink:0,fontSize:10,color:T.txt2,lineHeight:1.5}}>
        1. Vormerkung antippen (links) · 2. Buchung antippen (rechts) · 3. <b style={{color:T.blue}}>Zuordnen ✓</b>
      </div>

      {/* Zuordnen-Button wenn beide gewählt */}
      {selPend&&selTx&&(
        <div style={{padding:"8px 14px",background:"rgba(74,159,212,0.12)",
          borderBottom:`1px solid ${T.blue}44`,flexShrink:0,display:"flex",gap:8,alignItems:"center"}}>
          <div style={{flex:1,fontSize:11,color:T.txt}}>
            <span style={{color:T.gold,display:"inline-flex",alignItems:"center",gap:4}}>{Li("clock",12,T.gold)}{txs.find(t=>t.id===selPend)?.desc||"Vormerkung"}</span>
            <span style={{color:T.txt2,padding:"0 4px"}}>{Li("arrow-left-right",12,T.txt2)}</span>
            <span style={{color:T.txt}}>{txs.find(t=>t.id===selTx)?.desc||"Buchung"}</span>
          </div>
          <button onClick={doMatch}
            style={{background:T.blue,border:"none",
              borderRadius:9,padding:"7px 16px",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>
            Zuordnen ✓
          </button>
          <button onClick={()=>{setSelPend(null);setSelTx(null);}}
            style={{background:"none",border:"none",color:T.txt2,cursor:"pointer",fontSize:14}}>{Li("x",13)}</button>
        </div>
      )}

      {/* Zwei Spalten */}
      <div style={{flex:1,display:"flex",overflow:"hidden",gap:0}}>

        {/* Links: Vormerkungen */}
        <div style={{flex:1,overflowY:"auto",padding:"8px 8px 8px 14px",borderRight:`1px solid ${T.bd}`}}>
          <div style={{color:T.gold,fontSize:10,fontWeight:700,marginBottom:4}}>
            Vormerkungen ({unmatchedPends.length} offen)
          </div>
          <div style={{display:"flex",alignItems:"center",gap:4,background:"rgba(0,0,0,0.2)",borderRadius:7,padding:"3px 7px",marginBottom:6}}>
            {Li("search",10,T.txt2)}
            <input value={searchPend} onChange={e=>setSearchPend(e.target.value)}
              placeholder="suchen…"
              style={{background:"transparent",border:"none",color:T.txt,fontSize:10,outline:"none",flex:1,minWidth:0}}/>
            {searchPend&&<button onClick={()=>setSearchPend("")} style={{background:"none",border:"none",color:T.txt2,cursor:"pointer",padding:0,fontSize:9}}>✕</button>}
          </div>

          {filteredPends.length===0&&(
            <div style={{color:T.txt2,fontSize:11,marginBottom:8}}>
              {searchPend ? "keine Treffer" : "Alle zugeordnet ✓"}
            </div>
          )}

          {filteredPends.map(tx=>{
            const cat=getCat((tx.splits||[])[0]?.catId);
            const isActive=selPend===tx.id;
            return (
              <div key={tx.id} onClick={()=>setSelPend(isActive?null:tx.id)}
                style={rowS(isActive,T.gold)}>
                <div style={{width:28,height:28,borderRadius:8,background:(cat?.color||"#888")+"33",
                  display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>
                  {Li(cat?.icon||"tag",16,cat?.color||T.gold)||"?"}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{color:T.txt,fontSize:11,fontWeight:600,
                    overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                    {tx.desc||cat?.name||"Vormerkung"}{tx.note&&<span title={tx.note} style={{marginLeft:3,display:"inline-flex"}}>{Li("sticky-note",9,T.gold)}</span>}
                  </div>
                  <div style={{color:T.txt2,fontSize:9}}>{cat?.name||"unkategorisiert"}</div>
                </div>
                <div style={{color:T.gold,fontSize:11,fontWeight:700,fontFamily:"monospace",flexShrink:0}}>
                  {fmt(tx.totalAmount)}
                </div>
              </div>
            );
          })}

          {/* Bereits gematched */}
          {matched.length>0&&(
            <>
              <div style={{color:T.pos,fontSize:10,fontWeight:700,margin:"10px 0 6px"}}>
                ✓ Zugeordnet ({matched.length})
              </div>
              {matched.map(m=>{
                const pend=txs.find(t=>t.id===m.pendId);
                const real=txs.find(t=>t.id===m.txId);
                if(!pend||!real) return null;
                return (
                  <div key={m.pendId} style={{display:"flex",alignItems:"center",gap:6,
                    padding:"6px 10px",borderRadius:8,marginBottom:3,
                    background:"rgba(52,211,153,0.08)",border:`1px solid ${T.pos}44`}}>
                    <span style={{color:T.pos,fontSize:10,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                      ✓ {pend.desc||"Vormerkung"}
                    </span>
                    <button onClick={()=>setMatched(p=>p.filter(x=>x.pendId!==m.pendId))}
                      style={{background:"none",border:"none",color:T.txt2,cursor:"pointer",fontSize:11}}>{Li("corner-up-left",13)}</button>
                  </div>
                );
              })}
            </>
          )}

          {/* Neue Vormerkung */}
          <div style={{marginTop:10}}>
            {!showNewPend
              ? <button onClick={()=>setShowNewPend(true)}
                  style={{width:"100%",padding:"7px",borderRadius:9,
                    border:`1px dashed ${T.bds}`,background:"transparent",
                    color:T.gold,fontSize:11,cursor:"pointer"}}>
                  + neue Vormerkung
                </button>
              : <div style={{background:"rgba(245,158,11,0.08)",borderRadius:12,
                  padding:"12px",border:`1px solid ${T.gold}44`}}>
                  {/* Ausgabe / Einnahme Toggle */}
                  <div style={{display:"flex",gap:4,marginBottom:6}}>
                    {[["expense","Ausgabe",T.neg],["income","Einnahme",T.pos]].map(([val,label,col])=>(
                      <button key={val} onClick={()=>setNewPend(p=>({...p,csvType:val,catId:"",subId:""}))}
                        style={{flex:1,padding:"5px",borderRadius:8,cursor:"pointer",fontSize:11,fontWeight:700,
                          border:`2px solid ${newPend.csvType===val?col:"transparent"}`,
                          background:newPend.csvType===val?col+"22":"rgba(255,255,255,0.04)",
                          color:newPend.csvType===val?col:T.txt2,fontFamily:"inherit"}}>
                        {val==="expense"?"−":"+"} {label}
                      </button>
                    ))}
                  </div>
                  {/* Datum */}
                  <input type="date" value={newPend.date}
                    onChange={e=>setNewPend(p=>({...p,date:e.target.value}))}
                    style={{width:"100%",background:"rgba(255,255,255,0.06)",border:`1px solid ${T.bds}`,
                      borderRadius:8,padding:"6px 8px",color:T.txt,fontSize:11,outline:"none",
                      marginBottom:6,boxSizing:"border-box",colorScheme:"dark"}}/>
                  {/* Beschreibung */}
                  <input placeholder="Beschreibung" value={newPend.desc}
                    onChange={e=>setNewPend(p=>({...p,desc:e.target.value}))}
                    style={{width:"100%",background:"rgba(255,255,255,0.06)",border:`1px solid ${T.bds}`,
                      borderRadius:8,padding:"6px 8px",color:T.txt,fontSize:11,outline:"none",
                      marginBottom:6,boxSizing:"border-box"}}/>
                  {/* Betrag */}
                  <input placeholder="Betrag" value={newPend.amount}
                    onChange={e=>setNewPend(p=>({...p,amount:e.target.value}))} inputMode="decimal"
                    style={{width:"100%",background:"rgba(255,255,255,0.06)",border:`1px solid ${T.bds}`,
                      borderRadius:8,padding:"6px 8px",color:T.txt,fontSize:13,fontWeight:700,
                      outline:"none",marginBottom:6,boxSizing:"border-box",textAlign:"right"}}/>
                  {/* Kategorie */}
                  <CatPicker value={newPend.catId+"|"+newPend.subId}
                    onChange={(c,s)=>setNewPend(p=>({...p,catId:c,subId:s}))}
                    placeholder="Kategorie…"
                    filterType={newPend.csvType||"expense"}/>
                  {/* Zahlungsart */}
                  {accounts.length>0&&(
                    <div style={{display:"flex",gap:4,marginBottom:6,flexWrap:"wrap"}}>
                      {accounts.map(acc=>(
                        <button key={acc.id} onClick={()=>setNewPend(p=>({...p,accountId:acc.id}))}
                          style={{padding:"4px 8px",borderRadius:7,cursor:"pointer",fontSize:10,fontWeight:600,
                            border:`2px solid ${newPend.accountId===acc.id?acc.color:"transparent"}`,
                            background:newPend.accountId===acc.id?acc.color+"22":"rgba(255,255,255,0.04)",
                            color:newPend.accountId===acc.id?acc.color:T.txt2}}>
                          {Li(acc.icon,14,T.txt2)} {acc.name}{acc.delayDays>0&&<span style={{color:T.gold,fontSize:"0.8em",fontWeight:700,marginLeft:2}}>+{acc.delayDays}d</span>}
                        </button>
                      ))}
                    </div>
                  )}
                  {/* Wiederholung */}
                  <div style={{marginBottom:6}}>
                    <div style={{color:T.txt2,fontSize:10,marginBottom:4}}>Wiederholung (Monate)</div>
                    <div style={{display:"flex",gap:4,alignItems:"center"}}>
                      {[1,2,3,6,12,24].map(n=>(
                        <button key={n} onClick={()=>setNewPend(p=>({...p,repeatMonths:n}))}
                          style={{flex:1,padding:"5px 0",borderRadius:7,
                            border:newPend.repeatMonths===n?`2px solid ${T.gold}`:"2px solid transparent",
                            cursor:"pointer",fontSize:10,fontWeight:700,
                            background:newPend.repeatMonths===n?"rgba(255,213,128,0.15)":"rgba(255,255,255,0.05)",
                            color:newPend.repeatMonths===n?T.gold:T.txt2}}>
                          {n}
                        </button>
                      ))}
                      <input type="number" min="1" max="120" value={newPend.repeatMonths}
                        onChange={e=>setNewPend(p=>({...p,repeatMonths:Math.max(1,parseInt(e.target.value)||1)}))}
                        style={{width:40,background:"rgba(255,255,255,0.06)",border:`1px solid ${T.bds}`,
                          borderRadius:7,padding:"5px 4px",color:T.txt,fontSize:10,outline:"none",textAlign:"center"}}/>
                    </div>
                    {newPend.repeatMonths>1&&(
                      <div style={{color:T.gold,fontSize:10,marginTop:4}}>
                        ↩ Erstellt {newPend.repeatMonths} Vormerkungen ab {newPend.date}
                      </div>
                    )}
                  </div>
                  {/* Buttons */}
                  <div style={{display:"flex",gap:6}}>
                    <button onClick={()=>setShowNewPend(false)}
                      style={{flex:1,padding:"7px",borderRadius:8,border:`1px solid ${T.bds}`,
                        background:"transparent",color:T.txt2,fontSize:11,cursor:"pointer"}}>{Li("x",13)}</button>
                    <button onClick={addNewPending} disabled={!newPend.amount||!newPend.catId}
                      style={{flex:2,padding:"7px",borderRadius:8,border:"none",
                        background:newPend.amount&&newPend.catId?T.gold:T.disabled,
                        color:"#000",fontSize:11,fontWeight:700,
                        cursor:newPend.amount&&newPend.catId?"pointer":"default",
                        opacity:newPend.amount&&newPend.catId?1:0.4}}>
                      {newPend.repeatMonths>1?`${newPend.repeatMonths}× anlegen`:"anlegen"}
                    </button>
                  </div>
                </div>
            }
          </div>
        </div>

        {/* Rechts: echte Buchungen */}
        <div style={{flex:1,overflowY:"auto",padding:"8px 14px 8px 8px"}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
            <div style={{color:T.txt,fontSize:10,fontWeight:700,flex:1}}>
              Buchungen ({filteredTxs.length}{filteredTxs.length!==unmatchedTxs.length?` / ${unmatchedTxs.length}`:""})
            </div>
            <button onClick={()=>setMatchAmt(v=>!v)}
              title={matchAmt?"alle Buchungen zeigen":"nur passende Beträge zeigen"}
              style={{display:"flex",alignItems:"center",gap:4,padding:"3px 8px",borderRadius:7,
                border:`1.5px solid ${matchAmt?T.blue:T.bds}`,cursor:"pointer",fontFamily:"inherit",
                background:matchAmt?`${T.blue}22`:"transparent",
                color:matchAmt?T.blue:T.txt2,fontSize:9,fontWeight:700,
                opacity:selPend?1:0.4,transition:"all 0.15s"}}>
              {Li("filter",10,matchAmt?T.blue:T.txt2)}
              {matchAmt?"≈ Betrag aktiv":"≈ Betrag"}
            </button>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:4,background:"rgba(0,0,0,0.2)",borderRadius:7,padding:"3px 7px",marginBottom:6}}>
            {Li("search",10,T.txt2)}
            <input value={searchTx} onChange={e=>setSearchTx(e.target.value)}
              placeholder="suchen…"
              style={{background:"transparent",border:"none",color:T.txt,fontSize:10,outline:"none",flex:1,minWidth:0}}/>
            {searchTx&&<button onClick={()=>setSearchTx("")} style={{background:"none",border:"none",color:T.txt2,cursor:"pointer",padding:0,fontSize:9}}>✕</button>}
          </div>

          {filteredTxs.length===0&&(
            <div style={{color:T.txt2,fontSize:11}}>
              {searchTx ? "keine Treffer" : "keine Buchungen in diesem Monat"}
            </div>
          )}

          {filteredTxs.map(tx=>{
            const cat=getCat((tx.splits||[])[0]?.catId);
            const type=txType(tx);
            const isActive=selTx===tx.id;
            const isUncat=(tx.splits||[]).length===0||(tx.splits||[]).every(s=>!s.catId);
            const col=type==="income"?T.pos:T.neg;
            return (
              <div key={tx.id} onClick={()=>setSelTx(isActive?null:tx.id)}
                style={rowS(isActive,col)}>
                {/* Betrag LINKS — zum schnellen Vergleich mit Vormerkungsbetrag */}
                <div style={{color:col,fontSize:12,fontWeight:800,
                  fontFamily:"monospace",flexShrink:0,minWidth:64,textAlign:"right",
                  paddingRight:6,
                  background: matchAmt&&selectedPendAmt!==null&&Math.abs(Math.abs(tx.totalAmount)-selectedPendAmt)<0.01
                    ? `${col}22` : "transparent",
                  borderRadius:4}}>
                  {type==="income"?"+":"−"}{fmt(tx.totalAmount)}
                </div>
                <div style={{width:28,height:28,borderRadius:8,
                  background:(cat?.color||"#888")+"33",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:14,flexShrink:0}}>
                  {tx.pending?(tx._seriesTyp==="finanzierung"?Li("credit-card",14,T.gold):tx._seriesId?Li("repeat",14,T.pos):Li("calendar",14,T.blue)):isUncat?Li("help-circle",14,T.txt2):Li(cat?.icon||"tag",14,cat?.color||T.txt2)}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{color:T.txt,fontSize:11,fontWeight:600,
                    overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                    {tx.desc||cat?.name||"Buchung"}{tx.note&&<span title={tx.note} style={{marginLeft:3,display:"inline-flex"}}>{Li("sticky-note",9,T.gold)}</span>}
                  </div>
                  <div style={{color:T.txt2,fontSize:9}}>
                    {tx.date} · {isUncat?"unkategorisiert":cat?.name||""}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div style={{padding:"10px 14px",borderTop:`1px solid ${T.bd}`,
        background:T.surf,flexShrink:0,display:"flex",gap:8}}>
        <button onClick={onClose}
          style={{flex:1,padding:"10px",borderRadius:11,
            border:`1px solid ${T.bds}`,background:"transparent",
            color:T.txt2,fontSize:13,cursor:"pointer"}}>
          Schließen
        </button>
        <button onClick={()=>{onClose();}}
          style={{flex:2,padding:"10px",borderRadius:11,border:"none",
            background:T.blue,
            color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>
          ✓ {matched.length} Zuordnung{matched.length!==1?"en":""} übernehmen
        </button>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═════════════════════════════════════════════════════════════════════════════
// ── Standalone component to avoid hook-in-IIFE violation ─────────────────────

// ══════════════════════════════════════════════════════════════════════
// QuickBtnsBar – Schnellwahl-Leiste mit Drag & Drop, Long-Press-Löschen, + am Ende
// ══════════════════════════════════════════════════════════════════════

export { MatchingScreen };
