// Auto-generated module (siehe app-src.jsx)

import React, { useMemo, useState } from "react";
import { SaldoHero2 } from "./SaldoHero2.jsx";
import { theme as T } from "../../theme/activeTheme.js";
import { groupBudgetPairs } from "../../utils/budgets.js";
import { dayOf, drillSort, fmt, pn } from "../../utils/format.js";
import { Li } from "../../utils/icons.jsx";
import { matchAmount, matchSearch } from "../../utils/search.js";

function PendingList({pTxs, getCat, txType, openEdit, dayOf, pendOpenAmt, getSub}) {
  const _pendOpenAmt = pendOpenAmt || (t=>t.totalAmount);
  const [expandedId, setExpandedId] = React.useState(null);
  const [search, setSearch] = React.useState("");
  const [collapsed, setCollapsed] = React.useState(true);
  const filtered = React.useMemo(()=>{
    const base = pTxs.filter(t=>{
      if(!search) return true;
      const isAmtSearch = /^[+\-=<>]?[\d.,]+$/.test(search.trim());
      if(isAmtSearch) return matchAmount(Math.abs(t.totalAmount), search.replace(/^[+\-]/,""));
      return matchSearch(t.desc, search);
    });
    return groupBudgetPairs([...base].sort(drillSort));
  }, [pTxs, search]);
  return (
    <div style={{background:T.vorm_bg||T.tab_pend,border:`2px solid ${T.vorm_bd||"rgba(255,200,0,0.8)"}`,borderRadius:16,margin:"0 10px 4px",padding:"7px 10px"}}>
      <div onClick={()=>setCollapsed(v=>!v)}
        style={{display:"flex",alignItems:"center",gap:6,marginBottom:collapsed?0:6,cursor:"pointer"}}>
        <span style={{color:T.gold,fontSize:11,fontWeight:700,display:"flex",alignItems:"center",gap:6,flex:1}}>
          <div style={{width:30,height:30,borderRadius:9,background:`${T.gold}22`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            {Li("clock",15,T.gold)}
          </div>
          Offene Vormerkungen ({pTxs.length})
        </span>
        {Li(collapsed?"chevron-down":"chevron-up",12,T.gold)}
        <div style={{display:"flex",alignItems:"center",gap:4,background:"rgba(0,0,0,0.2)",borderRadius:7,padding:"3px 7px"}}>
          {Li("search",11,T.txt2)}
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="suchen…"
            style={{background:"transparent",border:"none",color:T.txt,fontSize:11,outline:"none",width:80}}/>
          {search&&<button onClick={()=>setSearch("")}
            style={{background:"none",border:"none",color:T.txt2,cursor:"pointer",padding:0,fontSize:10}}>✕</button>}
        </div>
      </div>
      {!collapsed&&<>
      {filtered.length===0&&search&&(
        <div style={{color:T.txt2,fontSize:11,textAlign:"center",padding:"8px 0"}}>Keine Treffer</div>
      )}
      {filtered.map(tx=>{
        const cat=getCat((tx.splits||[])[0]?.catId);
        const day=dayOf(tx.date);
        const isIncome = txType(tx)==="income"||(tx._csvType==="income");
        const col = isIncome ? T.pos : T.neg;
        const isS = (tx.splits||[]).length>1;
        const isExpanded = expandedId===tx.id;
        // Budget-Paar: Mitte + Ende als eine Zeile
        if(tx._isBudgetPair) {
          return (
            <div key={tx.id}
              style={{borderBottom:"1px solid rgba(255,200,0,0.1)",
              background:T.surf3,borderRadius:6,marginBottom:2}}>
              <div onClick={()=>openEdit(tx)}
                style={{display:"flex",alignItems:"center",gap:8,padding:"4px 4px",cursor:"pointer"}}>
                <span>{(tx._budgetSubId?Li("target",16,T.gold):tx._seriesTyp==="finanzierung"?Li("credit-card",16,T.gold):tx._seriesId?Li("repeat",16,T.pos):Li("calendar",16,T.blue))}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{color:T.txt,fontSize:12,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{tx.desc||cat?.name}</div>
                  <div style={{color:T.txt2,fontSize:9}}>{tx.date.slice(0,7)}</div>
                </div>
                <div style={{display:"flex",gap:8,alignItems:"center",flexShrink:0}}>
                  <span style={{color:T.mid,fontSize:10}}>Mitte</span>
                  <span style={{color:col,fontSize:12,fontWeight:700,fontFamily:"monospace"}}>
                    {isIncome?"+":"−"}{fmt(tx._mitteAmt)}
                  </span>
                  <span style={{color:T.gold,fontSize:10}}>Gesamt</span>
                  <span style={{color:col,fontSize:12,fontWeight:700,fontFamily:"monospace"}}>
                    {isIncome?"+":"−"}{fmt(tx._mitteAmt+tx._endeAmt)}
                  </span>
                </div>
                <span style={{color:T.txt2,flexShrink:0}}>{Li("chevron-right",12)}</span>
              </div>
            </div>
          );
        }
        return (
          <div key={tx.id}
            style={{borderBottom:"1px solid rgba(255,200,0,0.1)",
            background:T.surf3,
            borderRadius:6,marginBottom:2,overflow:"hidden"}}>
            <div onClick={()=>{ if(isS){setExpandedId(isExpanded?null:tx.id);}else{openEdit(tx);} }}
              style={{display:"flex",alignItems:"center",gap:8,padding:"4px 4px",cursor:"pointer"}}>
              <span>{(tx._budgetSubId?Li("target",16,T.gold):tx._seriesTyp==="finanzierung"?Li("credit-card",16,T.gold):tx._seriesId?Li("repeat",16,T.pos):Li("calendar",16,T.blue))}</span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{color:T.txt,fontSize:12,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{tx.desc||cat?.name}</div>
                <div style={{color:T.txt2,fontSize:9}}>{tx.date}{tx._seriesId&&tx._seriesTotal>1&&tx._seriesIdx&&tx._seriesTyp==="finanzierung"?` · ${tx._seriesIdx}/${tx._seriesTotal}`:""}</div>
              </div>
              <span style={{color:day<=14?T.mid:T.gold,fontSize:10,flexShrink:0}}>{day<=14?"Mitte":"Ende"}</span>
              <span style={{color:col,fontSize:12,fontWeight:700,fontFamily:"monospace",flexShrink:0}}>
                {isIncome?"+":"−"}{fmt(_pendOpenAmt(tx))}
              </span>
              <span style={{color:T.txt2,flexShrink:0}}>{Li(isS?(isExpanded?"chevron-up":"chevron-down"):"chevron-right",12)}</span>
            </div>
            {isS&&isExpanded&&(
              <div style={{padding:"4px 8px 6px",display:"flex",flexDirection:"column",gap:3}}>
                {(tx.splits||[]).filter(s=>s.catId).map(s=>{
                  const sCat=getCat(s.catId), sSub=getSub?getSub(s.catId,s.subId):null;
                  return (
                    <div key={s.id} style={{display:"flex",alignItems:"center",gap:8,
                      padding:"4px 8px",borderRadius:7,background:T.surf3,
                      border:`1px solid ${T.bd}`}}>
                      <span style={{width:8,height:8,borderRadius:"50%",flexShrink:0,
                        background:sCat?.color||T.txt2,display:"inline-block"}}/>
                      <span style={{flex:1,color:sCat?.color||T.txt2,fontSize:11,fontWeight:600,
                        overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                        {sSub?.name||sCat?.name||"?"}
                      </span>
                      <span style={{color:col,fontSize:11,fontWeight:700,fontFamily:"monospace",flexShrink:0}}>
                        {isIncome?"+":"−"}{fmt(pn(s.amount))}
                      </span>
                    </div>
                  );
                })}
                <button onClick={()=>openEdit(tx)}
                  style={{padding:"5px",borderRadius:7,border:`1px solid ${T.bds}`,
                    background:"transparent",color:T.blue,fontSize:10,cursor:"pointer",
                    display:"flex",alignItems:"center",justifyContent:"center",gap:4,fontFamily:"inherit"}}>
                  {Li("edit",10,T.blue)} Bearbeiten
                </button>
              </div>
            )}
          </div>
        );
      })}
      </>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// ── SaldoHero2: Kompakter Hero ───────────────────────────────────────

export { PendingList };
