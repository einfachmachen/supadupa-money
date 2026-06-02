// Auto-generated module (siehe app-src.jsx)

import React, { useContext, useState } from "react";
import { AppCtx } from "../../state/AppContext.js";
import { theme as T } from "../../theme/activeTheme.js";
import { uid } from "../../utils/format.js";
import { Li } from "../../utils/icons.jsx";
import { extractVendor, getVendorSuggestions } from "../../utils/tx.js";

function NachkategorisierenButton() {
  const {txs, setTxs, cats, getCat, getSub, csvRules, setReviewQueue} = useContext(AppCtx);
  const [result, setResult] = React.useState(null);

  const findRule = (desc) => {
    const d = desc.toLowerCase();
    let bestKey = null, bestLen = 0;
    Object.keys(csvRules).forEach(key=>{
      if(d.includes(key) && key.length > bestLen) { bestKey=key; bestLen=key.length; }
    });
    return bestKey ? csvRules[bestKey] : null;
  };

  const run = (onlyUncat) => {
    const toReview = [];
    let autoCount = 0;

    const newTxsState = txs.map(tx => {
      if(tx.pending) return tx;
      const isUncat = !(tx.splits||[]).some(sp=>sp.catId);
      if(onlyUncat && !isUncat) return tx;

      const rule = findRule(tx.desc);
      if(rule) {
        // Eindeutige Regel → automatisch zuordnen
        autoCount++;
        return {...tx, splits:[{id:uid(), catId:rule.catId, subId:rule.subId||"", amount:tx.totalAmount}]};
      }

      // Prüfe ob Händler mehrdeutige History hat (verschiedene Kategorien)
      const vendor = extractVendor(tx.desc);
      const suggestions = getVendorSuggestions(vendor, txs, cats, getSub, getCat)
        .filter(s => {
          // Nur Kategorien des richtigen Typs vorschlagen
          const cat = getCat(s.catId);
          if(!cat || !tx._csvType) return true;
          const catBeh = cat.type; // "income", "expense", "tagesgeld"
          if(tx._csvType==="income") return catBeh==="income"||catBeh==="tagesgeld";
          return catBeh==="expense";
        });
      if(suggestions.length > 1) {
        // Mehrere verschiedene Kategorien für diesen Händler → zur Überprüfung
        toReview.push({tx, suggestions, vendor});
      } else if(suggestions.length === 1) {
        // Genau eine Kategorie bekannt → automatisch zuordnen
        autoCount++;
        return {...tx, splits:[{id:uid(), catId:suggestions[0].catId, subId:suggestions[0].subId||"", amount:tx.totalAmount}]};
      }
      return tx;
    });

    setTxs(newTxsState);

    if(toReview.length > 0) {
      setReviewQueue({items: toReview, idx: 0, autoCount});
    } else {
      setResult({matched: autoCount, skipped: newTxsState.filter(t=>!t.pending&&!(t.splits||[]).some(s=>s.catId)).length});
      setTimeout(()=>setResult(null), 4000);
    }
  };

  const uncatCount = (txs||[]).filter(tx=>!tx.pending && !(tx.splits||[]).some(sp=>sp.catId)).length;

  return (
    <div style={{display:"flex",flexDirection:"column",gap:6}}>
      <button onClick={()=>run(true)}
        style={{width:"100%",padding:"8px",borderRadius:9,
          border:`1px solid ${T.gold}44`,background:"rgba(245,166,35,0.08)",
          color:T.gold,fontSize:12,fontWeight:600,cursor:"pointer",
          display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
        {Li("tag",13,T.gold)} Nur unkategorisierte zuordnen ({uncatCount})
      </button>
      <button onClick={()=>run(false)}
        style={{width:"100%",padding:"8px",borderRadius:9,
          border:`1px solid ${T.neg}33`,background:"rgba(224,80,96,0.06)",
          color:T.neg,fontSize:12,fontWeight:600,cursor:"pointer",
          display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
        {Li("refresh-cw",13,T.neg)} Alle Buchungen neu zuordnen
      </button>
      {result!==null&&(
        <div style={{background:"rgba(170,204,0,0.1)",border:`1px solid ${T.pos}44`,borderRadius:8,
          padding:"6px 10px",fontSize:11,color:T.pos,display:"flex",alignItems:"center",gap:6}}>
          {Li("check-circle",12,T.pos)} {result.matched} zugeordnet · {result.skipped} ohne Treffer
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// LIVE COLOR PICKER v3 — T-Key basiert, speichert über Theme-System
// ══════════════════════════════════════════════════════════════════════

export { NachkategorisierenButton };
