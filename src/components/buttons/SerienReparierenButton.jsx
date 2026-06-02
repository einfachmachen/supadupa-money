// Auto-generated module (siehe app-src.jsx)

import React, { useContext, useState } from "react";
import { AppCtx } from "../../state/AppContext.js";
import { theme as T } from "../../theme/activeTheme.js";
import { uid } from "../../utils/format.js";
import { Li } from "../../utils/icons.jsx";

function SerienReparierenButton() {
  const {txs, setTxs} = useContext(AppCtx);
  const [result, setResult] = React.useState(null);

  const reparieren = () => {
    // Nur pending ohne _seriesId
    const pending = txs.filter(t=>t.pending && !t._seriesId);

    // Gruppiere nach desc + betrag + catId
    const groups = {};
    pending.forEach(t=>{
      const catId = (t.splits||[])[0]?.catId||"";
      const key = `${(t.desc||"").trim().toLowerCase()}|${Math.round(t.totalAmount*100)}|${catId}`;
      if(!groups[key]) groups[key]=[];
      groups[key].push(t);
    });

    const updates = {};
    let seriesFound = 0;

    Object.values(groups).forEach(grp=>{
      if(grp.length < 2) return;
      const sorted = [...grp].sort((a,b)=>a.date.localeCompare(b.date));

      // Teile in aufeinanderfolgende Blöcke auf (max 1 Monat Abstand)
      const blocks = [[sorted[0]]];
      for(let i=1;i<sorted.length;i++){
        const prev = new Date(sorted[i-1].date);
        const curr = new Date(sorted[i].date);
        const diffMonths = (curr.getFullYear()-prev.getFullYear())*12+(curr.getMonth()-prev.getMonth());
        if(diffMonths === 1) {
          blocks[blocks.length-1].push(sorted[i]);
        } else {
          blocks.push([sorted[i]]); // neue Gruppe
        }
      }

      // Nur Blöcke mit ≥2 aufeinanderfolgenden Buchungen als Serie markieren
      blocks.forEach(block=>{
        if(block.length < 2) return;
        const seriesId = "series-"+uid();
        block.forEach((t,i)=>{
          updates[t.id] = {_seriesId:seriesId, _seriesIdx:i+1, _seriesTotal:block.length};
        });
        seriesFound++;
      });
    });

    if(Object.keys(updates).length === 0) {
      setResult("Keine aufeinanderfolgenden Serien gefunden.");
      setTimeout(()=>setResult(null), 3000);
      return;
    }

    const count = Object.keys(updates).length;
    setTxs(p=>p.map(t=>updates[t.id]?{...t,...updates[t.id]}:t));
    setResult(`✓ ${seriesFound} Serie${seriesFound!==1?"n":""} mit ${count} Buchungen erkannt`);
    setTimeout(()=>setResult(null), 4000);
  };

  const ohneId = txs.filter(t=>t.pending&&!t._seriesId).length;
  if(ohneId === 0 && !result) return null;

  return (
    <div style={{display:"flex",flexDirection:"column",gap:4}}>
      <button onClick={reparieren}
        style={{width:"100%",padding:"8px",borderRadius:9,
          border:`1px solid ${T.gold}44`,background:"rgba(245,166,35,0.08)",
          color:T.gold,fontSize:12,fontWeight:600,cursor:"pointer",
          display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
        {Li("link",13,T.gold)} {ohneId} Vormerkungen zu Serien zusammenfassen
      </button>
      {result&&<div style={{color:T.pos,fontSize:11,textAlign:"center"}}>{result}</div>}
    </div>
  );
}

export { SerienReparierenButton };
