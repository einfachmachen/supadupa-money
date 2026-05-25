// Auto-generated module (siehe app-src.jsx)

import React, { useState } from "react";
import { theme as T } from "../../theme/activeTheme.js";
import { fmt } from "../../utils/format.js";
import { Li } from "../../utils/icons.jsx";

function ChartBlock({catSums, maxSum, budgets, getBudgetForMonth, year, month}) {
  const [chartMode, setChartMode] = React.useState(3);
  const modes = [3, 10, 0];
  const nextMode = () => setChartMode(m => modes[(modes.indexOf(m)+1)%modes.length]);
  const shown = chartMode===0 ? catSums : catSums.slice(0, chartMode);
  const modeLabel = chartMode===0 ? "alle" : String(chartMode);
  return (
    <div style={{margin:"0 10px 6px",background:T.hero_bg,borderRadius:20,padding:"10px 12px 8px"}}>
      <div style={{display:"flex",alignItems:"center",marginBottom:6}}>
        <div style={{color:T.lbl||T.txt2,fontSize:10,fontWeight:700,letterSpacing:0.5,textTransform:"uppercase",flex:1}}>Top Ausgaben</div>
        <button onClick={nextMode}
          style={{background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.12)",
            borderRadius:7,padding:"2px 8px",color:T.txt2,fontSize:10,fontWeight:700,
            cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>
          {Li("bar-chart-2",11,T.txt2)} {modeLabel}
        </button>
      </div>
      {shown.map(cat=>{
        const budget = (cat.subs||[]).reduce((s,sub)=>s+(getBudgetForMonth(sub.id,year,month)||0),0);
        const barMax = budget>0 ? Math.max(budget, cat.sum) : maxSum;
        const barPct = Math.min(100, (cat.sum/barMax)*100);
        const remaining = budget>0 ? budget-cat.sum : null;
        return (
          <div key={cat.id} style={{marginBottom:6}}>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
              <span style={{width:16,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{Li(cat.icon,12,cat.color||T.txt2)}</span>
              <span style={{color:"rgba(255,255,255,0.75)",fontSize:10,fontWeight:600,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{cat.name}</span>
              <span style={{color:"rgba(255,255,255,0.6)",fontSize:10,fontFamily:"monospace",flexShrink:0}}>{fmt(cat.sum)}</span>
            </div>
            <div style={{height:4,borderRadius:2,background:"rgba(255,255,255,0.07)",position:"relative",marginLeft:22}}>
              {budget>0&&<div style={{position:"absolute",inset:0,borderRadius:2,background:"rgba(255,255,255,0.12)"}}/>}
              <div style={{height:"100%",width:`${barPct}%`,background:remaining!==null&&remaining<0?T.neg:cat.color,borderRadius:2,zIndex:1,position:"relative"}}/>
            </div>
            {remaining!==null&&(
              <div style={{paddingLeft:22,fontSize:9,color:remaining>=0?T.pos:T.neg,fontWeight:700,marginTop:1}}>
                {remaining>=0?`${fmt(remaining)} Budget übrig`:`${fmt(Math.abs(remaining))} überzogen`}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export { ChartBlock };
