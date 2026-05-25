// Auto-generated module (siehe app-src.jsx)

import React, { useContext, useState } from "react";
import { CatPicker } from "../molecules/CatPicker.jsx";
import { AppCtx } from "../../state/AppContext.js";
import { theme as T } from "../../theme/activeTheme.js";
import { fmt, uid } from "../../utils/format.js";
import { Li } from "../../utils/icons.jsx";

function ReviewQueueModal({queue, setQueue}) {
  const {txs, setTxs, getCat, getSub} = useContext(AppCtx);
  const item = queue.items[queue.idx];
  const remaining = queue.items.length - queue.idx;
  const [showPicker, setShowPicker] = React.useState(false);

  const apply = (catId, subId) => {
    setTxs(prev => prev.map(t =>
      t.id===item.tx.id ? {...t, splits:[{id:uid(), catId, subId:subId||"", amount:t.totalAmount}]} : t
    ));
    next();
  };

  const next = () => {
    const nextIdx = queue.idx + 1;
    if(nextIdx >= queue.items.length) {
      setQueue(null);
    } else {
      setQueue(q=>({...q, idx: nextIdx}));
      setShowPicker(false);
    }
  };

  return (
    <div onClick={e=>e.stopPropagation()}
      style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",backdropFilter:"blur(8px)",
        zIndex:90,display:"flex",alignItems:"center",justifyContent:"center",padding:20,overflowY:"auto"}}>
      <div style={{background:T.surf2,borderRadius:20,width:"100%",maxWidth:440,
        display:"flex",flexDirection:"column",
        border:`1px solid ${T.bds}`,boxShadow:"0 8px 40px rgba(0,0,0,0.7)"}}>
        {/* Header */}
        <div style={{background:"rgba(74,159,212,0.12)",padding:"12px 16px",borderBottom:`1px solid ${T.bd}`}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
            <div style={{color:queue.mode==="typfix"?T.neg:T.blue,fontWeight:700,fontSize:13,display:"flex",alignItems:"center",gap:6}}>
              {Li(queue.mode==="typfix"?"alert-triangle":"help-circle",13,queue.mode==="typfix"?T.neg:T.blue)}
              {queue.mode==="typfix" ? "Falsche Kategorie?" : "kategorie wählen"}
            </div>
            <div style={{color:T.txt2,fontSize:11}}>{queue.idx+1} / {queue.items.length}</div>
          </div>
          <div style={{color:T.txt,fontSize:12,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
            {item.tx.desc}
          </div>
          <div style={{color:T.txt2,fontSize:11,marginTop:2,display:"flex",gap:8}}>
            <span>{item.tx.date}</span>
            <span style={{color:item.tx._csvType==="income"?T.pos:T.neg,fontWeight:700}}>
              {item.tx._csvType==="income"?"+":"−"}{fmt(Math.abs(item.tx.totalAmount))} laut CSV
            </span>
          </div>
          {queue.mode==="typfix"&&item.wrongCatName&&(
            <div style={{marginTop:6,padding:"4px 8px",borderRadius:7,
              background:"rgba(224,80,96,0.15)",border:`1px solid ${T.neg}44`,
              color:T.neg,fontSize:11,display:"flex",alignItems:"center",gap:6}}>
              {Li("x-circle",11,T.neg)} aktuell falsch: <b>{item.wrongCatName}</b>
              {item.tx._csvType==="income"
                ? " (ist Ausgaben-Kategorie, aber CSV zeigt Einnahme)"
                : " (ist Einnahmen-Kategorie, aber CSV zeigt Ausgabe)"}
            </div>
          )}
        </div>
        {/* Vorschläge */}
        <div style={{padding:"12px 14px"}}>
          {!showPicker ? (<>
            <div style={{color:T.txt2,fontSize:11,marginBottom:8}}>
              {queue.mode==="typfix"
                ? `Welche ${item.tx._csvType==="income"?"Einnahmen":"Ausgaben"}-Kategorie passt?`
                : "Dieser Händler wurde bisher verschiedenen Kategorien zugeordnet:"}
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:10}}>
              {item.suggestions.map((s,i)=>(
                <button key={i} onClick={()=>apply(s.catId, s.subId)}
                  style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:11,
                    border:`1px solid ${s.color}55`,background:s.color+"11",
                    cursor:"pointer",textAlign:"left",width:"100%",fontFamily:"inherit"}}>
                  <div style={{width:32,height:32,borderRadius:9,background:s.color+"22",
                    display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    {Li(s.icon,16,s.color)}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{color:s.color,fontSize:13,fontWeight:700}}>{s.catName}</div>
                    {s.subName&&<div style={{color:T.txt2,fontSize:11}}>{s.subName}</div>}
                  </div>
                  <div style={{color:T.txt2,fontSize:10,flexShrink:0,background:"rgba(255,255,255,0.06)",
                    borderRadius:6,padding:"2px 6px"}}>{s.count}×</div>
                </button>
              ))}
            </div>
            <div style={{display:"flex",gap:6}}>
              <button onClick={next}
                style={{flex:1,padding:"8px",borderRadius:9,border:`1px solid ${T.bd}`,
                  background:"transparent",color:T.txt2,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>
                Überspringen
              </button>
              <button onClick={()=>setShowPicker(true)}
                style={{flex:1,padding:"8px",borderRadius:9,border:`1px solid ${T.blue}44`,
                  background:"rgba(74,159,212,0.08)",color:T.blue,fontSize:11,
                  cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:4}}>
                {Li("list",11,T.blue)} Andere Kategorie
              </button>
            </div>
          </>) : (<>
            <div style={{color:T.txt2,fontSize:11,marginBottom:8,display:"flex",alignItems:"center",gap:6}}>
              <button onClick={()=>setShowPicker(false)}
                style={{background:"none",border:"none",color:T.blue,cursor:"pointer",padding:0,display:"flex"}}>
                {Li("arrow-left",13,T.blue)}
              </button>
              Kategorie wählen:
            </div>
            <CatPicker value="|" onChange={(catId,subId)=>{ if(catId) apply(catId,subId); }}
              placeholder="— Kategorie auswählen —"
              filterType={item.tx._csvType||null}
              accountId={item.tx.accountId||null}/>
          </>)}
        </div>
        {/* Fortschrittsbalken */}
        <div style={{height:3,background:"rgba(255,255,255,0.06)"}}>
          <div style={{height:"100%",
            width:`${(queue.idx/queue.items.length)*100}%`,
            background:T.blue,transition:"width 0.3s"}}/>
        </div>
      </div>
    </div>
  );
}

// Hilfsfunktion: Händlernamen aus Beschreibung extrahieren

export { ReviewQueueModal };
