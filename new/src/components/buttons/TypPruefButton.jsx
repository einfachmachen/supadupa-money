// Auto-generated module (siehe app-src.jsx)

import React, { useContext } from "react";
import { AppCtx } from "../../state/AppContext.js";
import { theme as T } from "../../theme/activeTheme.js";
import { Li } from "../../utils/icons.jsx";
import { extractVendor, getVendorSuggestions } from "../../utils/tx.js";

function TypPruefButton() {
  const {txs, getCat, groups, setReviewQueue} = useContext(AppCtx);

  const pruefen = () => {
    const falschZugeordnet = [];

    txs.forEach(tx => {
      if(tx.pending) return;
      const csvType = tx._csvType; // "income" oder "expense"
      if(!csvType) return; // kein CSV-Typ bekannt → überspringen
      const splits = tx.splits||[];
      if(splits.length===0 || !splits[0].catId) return; // unkategorisiert → überspringen

      // Typ der zugeordneten Kategorie ermitteln
      const cat = getCat(splits[0].catId);
      if(!cat) return;
      const grp = groups.find(g=>g.type===cat.type);
      const catBeh = grp?.behavior || cat.type;

      // Passt der Kategorietyp zum CSV-Typ?
      const catIsIncome = catBeh==="income"||catBeh==="tagesgeld";
      const csvIsIncome = csvType==="income";
      if(catIsIncome !== csvIsIncome) {
        // Falsch zugeordnet — Vorschläge für den richtigen Typ sammeln
        const vendor = extractVendor(tx.desc);
        const suggestions = getVendorSuggestions(vendor, txs, getCat, (cId,sId)=>{
          const c = getCat(cId); return c?.subs?.find(s=>s.id===sId);
        }, getCat)
          .filter(s=>{
            const sc = getCat(s.catId);
            const sg = groups.find(g=>g.type===sc?.type);
            const sb = sg?.behavior||sc?.type;
            return csvIsIncome ? (sb==="income"||sb==="tagesgeld") : sb==="expense";
          });
        falschZugeordnet.push({tx, suggestions, vendor,
          wrongCatName: cat.name, wrongCatColor: cat.color||"#888"});
      }
    });

    if(falschZugeordnet.length === 0) {
      alert("✓ Alle Buchungen haben den richtigen Typ!");
      return;
    }
    setReviewQueue({items: falschZugeordnet, idx: 0, autoCount: 0, mode: "typfix"});
  };

  const wrongCount = txs.filter(tx=>{
    if(tx.pending || !tx._csvType) return false;
    const splits = tx.splits||[];
    if(!splits[0]?.catId) return false;
    const cat = getCat(splits[0].catId);
    if(!cat) return false;
    const grp = groups.find(g=>g.type===cat.type);
    const catBeh = grp?.behavior||cat.type;
    const catIsIncome = catBeh==="income"||catBeh==="tagesgeld";
    return catIsIncome !== (tx._csvType==="income");
  }).length;

  if(wrongCount === 0) return null; // Kein Button wenn alles ok

  return (
    <button onClick={pruefen}
      style={{width:"100%",padding:"8px",borderRadius:9,
        border:`1px solid ${T.neg}66`,background:"rgba(224,80,96,0.1)",
        color:T.neg,fontSize:12,fontWeight:700,cursor:"pointer",
        display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
      {Li("alert-triangle",13,T.neg)} {wrongCount} falsch zugeordnete Buchungen prüfen
    </button>
  );
}

export { TypPruefButton };
