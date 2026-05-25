// Auto-generated module (siehe app-src.jsx)

import React, { useState } from "react";
import { theme as T } from "../../theme/activeTheme.js";
import { fmt } from "../../utils/format.js";
import { Li } from "../../utils/icons.jsx";

function VormVerknuepfenPanel({editVorm, txs, setTxs, onClose}) {
  const [showLink, setShowLink] = React.useState(false);
  const txMonth = new Date(editVorm.date).getMonth();
  const txYear  = new Date(editVorm.date).getFullYear();
  const candidates = txs.filter(t=>{
    if(t.pending||t._linkedTo) return false;
    const d=new Date(t.date);
    return d.getFullYear()===txYear&&d.getMonth()===txMonth;
  }).sort((a,b)=>{
    const aAmt=Math.abs(a.totalAmount-editVorm.totalAmount)<0.01?0:1;
    const bAmt=Math.abs(b.totalAmount-editVorm.totalAmount)<0.01?0:1;
    return aAmt-bAmt;
  }).slice(0,8);
  if(!candidates.length) return null;
  return (
    <div style={{marginBottom:8}}>
      <button onClick={()=>setShowLink(v=>!v)}
        style={{width:"100%",padding:"8px 10px",borderRadius:10,border:`1px solid ${T.blue}44`,
          background:`${T.blue}08`,color:T.blue,fontSize:12,fontWeight:700,cursor:"pointer",
          fontFamily:"inherit",display:"flex",alignItems:"center",gap:6,marginBottom:showLink?6:0}}>
        {Li("link",13,T.blue)} Buchung zuordnen ({candidates.length})
        {Li(showLink?"chevron-up":"chevron-down",11,T.blue)}
      </button>
      {showLink&&candidates.map(tx=>{
        const isMatch=Math.abs(tx.totalAmount-editVorm.totalAmount)<0.01;
        return (
          <div key={tx.id} onClick={()=>{
            setTxs(p=>p.map(t=>{
              if(t.id===tx.id) return {...t,linkedIds:[...(t.linkedIds||[]),editVorm.id],splits:(editVorm.splits||[]).length>0&&(editVorm.splits||[])[0]?.catId?[...editVorm.splits]:t.splits};
              if(t.id===editVorm.id) return {...t,pending:false,_linkedTo:tx.id};
              return t;
            }));
            onClose();
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
}

export { VormVerknuepfenPanel };
