// Auto-generated module (siehe app-src.jsx)

import React, { useContext, useState } from "react";
import { AppCtx } from "../../state/AppContext.js";
import { theme as T } from "../../theme/activeTheme.js";
import { Li } from "../../utils/icons.jsx";
import { kvStore } from "../../utils/kvStore.js";

function RegenRulesButton() {
  const {txs, setCsvRules} = useContext(AppCtx);
  const [result, setResult] = React.useState(null);

  const regen = () => {
    const newRules = {};
    txs.forEach(tx => {
      if(tx.pending) return;
      const splits = tx.splits||[];
      if(splits.length!==1 || !splits[0].catId) return;
      const desc = (tx.desc||"").replace(/\{[^}]{0,300}\}/g,"").trim();
      const vendor = desc.split("·")[0].split("–")[0].split(" · ")[0].trim().slice(0,40).toLowerCase();
      if(vendor.length>2) newRules[vendor] = {catId:splits[0].catId, subId:splits[0].subId||""};
    });
    const count = Object.keys(newRules).length;
    // MERGE mit bestehenden Regeln — nicht überschreiben!
    setCsvRules(prev => {
      const merged = {...prev, ...newRules};
      try { kvStore.setItem("mbt_csvRules_backup", JSON.stringify(merged)); } catch(e){}
      return merged;
    });
    setResult(count);
    setTimeout(()=>setResult(null), 3000);
  };

  return (
    <button onClick={regen}
      style={{width:"100%",padding:"8px",borderRadius:9,
        border:`1px solid ${result!==null?T.pos+"66":T.blue+"44"}`,
        background:result!==null?"rgba(170,204,0,0.1)":"rgba(74,159,212,0.08)",
        color:result!==null?T.pos:T.blue,fontSize:12,fontWeight:600,
        cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
      {result!==null
        ? <>{Li("check",13,T.pos)} {result} Regeln regeneriert & gespeichert</>
        : <>{Li("refresh-cw",13,T.blue)} Jetzt aus Buchungen regenerieren</>
      }
    </button>
  );
}

export { RegenRulesButton };
