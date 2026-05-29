// Auto-generated module (siehe app-src.jsx)

import React, { useState } from "react";
import { theme as T } from "../../theme/activeTheme.js";
import { fmt } from "../../utils/format.js";
import { Li } from "../../utils/icons.jsx";

function VerknuepfenPanel({editTx, txs, setTxs, setEditTx, setShowVormHub, setEditVormTx}) {
  const [showLink, setShowLink] = React.useState(false);
  if (!editTx) return null;
  const txMonth = new Date(editTx.date).getMonth();
  const txYear  = new Date(editTx.date).getFullYear();
  if (editTx.pending) {
    const candidates = txs.filter(t=>{
      if(t.pending||t._linkedTo) return false;
      const d=new Date(t.date);
      return d.getFullYear()===txYear&&d.getMonth()===txMonth;
    }).sort((a,b)=>{
      const aAmt=Math.abs(a.totalAmount-editTx.totalAmount)<0.01?0:1;
      const bAmt=Math.abs(b.totalAmount-editTx.totalAmount)<0.01?0:1;
      if(aAmt!==bAmt)return aAmt-bAmt;
      const aDesc=(a.desc||"").toLowerCase().slice(0,10);
      const eDesc=(editTx.desc||"").toLowerCase().slice(0,10);
      return aDesc===eDesc?-1:1;
    }).slice(0,8);
    if(!candidates.length) return null;
    return (
      <div style={{marginBottom:6}}>
        <button onClick={()=>setShowLink(v=>!v)}
          style={{width:"100%",padding:"8px 10px",borderRadius:10,border:`1px solid ${T.blue}44`,
            background:`${T.blue}08`,color:T.blue,fontSize:12,fontWeight:700,cursor:"pointer",
            fontFamily:"inherit",display:"flex",alignItems:"center",gap:6,marginBottom:showLink?6:0}}>
          {Li("link",13,T.blue)} Buchung zuordnen ({candidates.length})
          {Li(showLink?"chevron-up":"chevron-down",11,T.blue)}
        </button>
        {showLink&&candidates.map(tx=>{
          const isMatch=Math.abs(tx.totalAmount-editTx.totalAmount)<0.01;
          return (
            <div key={tx.id} onClick={()=>{
              setTxs(p=>p.map(t=>{
                if(t.id===tx.id) {
                  // Originalsplits sichern, falls noch nicht gesichert (für Entknüpfen).
                  // Wird nur überschrieben wenn die Vormerkung selbst eine Kategorie hat.
                  const vormSplitsHaveCat = (editTx.splits||[]).length>0 && (editTx.splits||[])[0]?.catId;
                  if(!vormSplitsHaveCat) return {...t, linkedIds:[...(t.linkedIds||[]), editTx.id]};
                  return {
                    ...t,
                    linkedIds: [...(t.linkedIds||[]), editTx.id],
                    _splitsBeforeLink: t._splitsBeforeLink || t.splits || [],
                    splits: [...editTx.splits],
                  };
                }
                if(t.id===editTx.id) return {...t, pending:false, _linkedTo:tx.id, accountId:tx.accountId};
                return t;
              }));
              setEditTx(null);
            }}
              style={{display:"flex",alignItems:"center",gap:8,padding:"6px 8px",borderRadius:8,marginBottom:3,cursor:"pointer",
                background:isMatch?"rgba(74,159,212,0.1)":"rgba(255,255,255,0.04)",border:`1px solid ${isMatch?T.blue:T.bd}`}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{color:T.txt,fontSize:11,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{tx.desc||"—"}</div>
                <div style={{color:T.txt2,fontSize:9}}>{tx.date}</div>
              </div>
              <span style={{color:isMatch?T.pos:T.txt,fontFamily:"monospace",fontSize:11,fontWeight:700,flexShrink:0}}>{fmt(tx.totalAmount)}</span>
              {Li("link",10,T.blue)}
            </div>
          );
        })}
      </div>
    );
  } else {
    const candidates = txs.filter(t=>{
      if(!t.pending||t._linkedTo||t._budgetSubId) return false;
      const d=new Date(t.date);
      return d.getFullYear()===txYear&&d.getMonth()===txMonth;
    }).sort((a,b)=>{
      const aAmt=Math.abs(a.totalAmount-editTx.totalAmount)<0.01?0:1;
      const bAmt=Math.abs(b.totalAmount-editTx.totalAmount)<0.01?0:1;
      return aAmt-bAmt;
    }).slice(0,8);
    if(!candidates.length) return null;
    return (
      <div style={{marginBottom:6}}>
        <button onClick={()=>setShowLink(v=>!v)}
          style={{width:"100%",padding:"8px 10px",borderRadius:10,border:`1px solid ${T.gold}44`,
            background:`${T.gold}08`,color:T.gold,fontSize:12,fontWeight:700,cursor:"pointer",
            fontFamily:"inherit",display:"flex",alignItems:"center",gap:6,marginBottom:showLink?6:0}}>
          {Li("link",13,T.gold)} Vormerkung zuordnen ({candidates.length})
          {Li(showLink?"chevron-up":"chevron-down",11,T.gold)}
        </button>
        {showLink&&candidates.map(pend=>{
          const isMatch=Math.abs(pend.totalAmount-editTx.totalAmount)<0.01;
          return (
            <div key={pend.id} onClick={()=>{
              setTxs(p=>p.map(t=>{
                if(t.id===editTx.id) {
                  const vormSplitsHaveCat = (pend.splits||[]).length>0 && (pend.splits||[])[0]?.catId;
                  if(!vormSplitsHaveCat) return {...t, linkedIds:[...(t.linkedIds||[]), pend.id]};
                  return {
                    ...t,
                    linkedIds: [...(t.linkedIds||[]), pend.id],
                    _splitsBeforeLink: t._splitsBeforeLink || t.splits || [],
                    splits: [...pend.splits],
                  };
                }
                if(t.id===pend.id) return {...t, pending:false, _linkedTo:editTx.id, accountId:editTx.accountId};
                return t;
              }));
              setEditTx(null);
            }}
              style={{display:"flex",alignItems:"center",gap:8,padding:"6px 8px",borderRadius:8,marginBottom:3,cursor:"pointer",
                background:isMatch?"rgba(245,166,35,0.1)":"rgba(255,255,255,0.04)",border:`1px solid ${isMatch?T.gold:T.bd}`}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{color:T.txt,fontSize:11,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{pend.desc||"—"}</div>
                <div style={{color:T.txt2,fontSize:9}}>{pend.date}</div>
              </div>
              <span style={{color:isMatch?T.gold:T.txt,fontFamily:"monospace",fontSize:11,fontWeight:700,flexShrink:0}}>{fmt(pend.totalAmount)}</span>
              {Li("link",10,T.gold)}
            </div>
          );
        })}
      </div>
    );
  }
}

export { VerknuepfenPanel };
