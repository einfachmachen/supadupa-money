// Auto-generated module (siehe app-src.jsx)

import React, { useState } from "react";
import { theme as T } from "../../theme/activeTheme.js";
import { fmt, NUM_FONT } from "../../utils/format.js";
import { Li } from "../../utils/icons.jsx";
import { linkPendingToReal, linkPendingToPending } from "../../utils/vormMatch.js";

// Beträge als Beträge (Math.abs auf BEIDEN Seiten) vergleichen, nicht die
// rohe Differenz: eine vom Bank-Live-Abruf übernommene Vormerkung trägt
// ihren Betrag VORZEICHENBEHAFTET (z.B. -2,98), die spätere echte Buchung
// aber als reinen Betrag (2,98) — ein reiner Differenz-Vergleich ergäbe dann
// ~5,96 statt ~0 und die eigentlich passende Buchung würde nie als Treffer
// erkannt (und bei vielen Buchungen im Monat u.U. aus den angezeigten Top 8
// herausfallen).
export function isVormAmountMatch(tx, editVorm) {
  return Math.abs(Math.abs(tx.totalAmount) - Math.abs(editVorm.totalAmount)) < 0.01;
}

// Kandidaten für "Buchung zuordnen": echte Buchungen UND bei der Bank selbst
// noch vorgemerkte (PDNG, _bankPending) Zeilen desselben Kontos + Monats wie
// die Vormerkung, noch unverknüpft, Betragstreffer zuerst. Bank-vorgemerkte
// Zeilen zählen mit dazu, damit sich eine manuell angelegte Vormerkung auch
// mit einer bereits vom Bank-Abruf übernommenen Vormerkung verknüpfen lässt
// (z.B. wenn beide während einer Offline-Phase unabhängig entstanden sind).
export function getVormLinkCandidates(txs, editVorm) {
  const txMonth = new Date(editVorm.date).getMonth();
  const txYear  = new Date(editVorm.date).getFullYear();
  // Nur Buchungen desselben Kontos wie die Vormerkung anbieten (Giro-Fallback).
  const editAcc = editVorm.accountId || "acc-giro";
  return txs.filter(t=>{
    if(t._linkedTo) return false;
    if(t.pending && !t._bankPending) return false;
    if((t.accountId||"acc-giro")!==editAcc) return false;
    const d=new Date(t.date);
    return d.getFullYear()===txYear&&d.getMonth()===txMonth;
  }).sort((a,b)=>{
    const aAmt=isVormAmountMatch(a,editVorm)?0:1;
    const bAmt=isVormAmountMatch(b,editVorm)?0:1;
    return aAmt-bAmt;
  }).slice(0,8);
}

function VormVerknuepfenPanel({editVorm, txs, setTxs, onClose}) {
  const [showLink, setShowLink] = React.useState(false);
  const candidates = getVormLinkCandidates(txs, editVorm);
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
        const isMatch=isVormAmountMatch(tx,editVorm);
        return (
          <div key={tx.id} onClick={()=>{
            // Ziel selbst noch bei der Bank vorgemerkt (PDNG) statt schon
            // gebucht → beide Vormerkungen verschmelzen (linkPendingToPending),
            // sonst normal mit der echten Buchung verknüpfen.
            setTxs(p=>tx.pending
              ? linkPendingToPending(p, editVorm.id, tx.id)
              : linkPendingToReal(p, editVorm.id, tx.id));
            onClose();
          }}
            style={{display:"flex",alignItems:"center",gap:8,padding:"6px 8px",borderRadius:8,marginBottom:3,cursor:"pointer",
              background:isMatch?"rgba(74,159,212,0.1)":"rgba(255,255,255,0.04)",border:`1px solid ${isMatch?T.blue:T.bd}`}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{color:T.txt,fontSize:11,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                {tx._bankPending&&<span style={{fontSize:8,background:"rgba(245,166,35,0.18)",color:T.gold,
                  borderRadius:4,padding:"1px 4px",fontWeight:800,marginRight:4,letterSpacing:0.2}}>VORGEMERKT</span>}
                {tx.desc||"—"}
              </div>
              <div style={{color:T.txt2,fontSize:9}}>{tx.date}</div>
            </div>
            <span style={{color:isMatch?T.pos:T.txt,fontFamily:NUM_FONT,fontSize:11,fontWeight:700,flexShrink:0}}>{fmt(tx.totalAmount)}</span>
            {Li("link",10,T.blue)}
          </div>
        );
      })}
    </div>
  );
}

export { VormVerknuepfenPanel };
