// Auto-generated module (siehe app-src.jsx)

import React, { useMemo, useState } from "react";
import { ChartBlock } from "./ChartBlock.jsx";
import { theme as T } from "../../theme/activeTheme.js";
import { fmt } from "../../utils/format.js";
import { Li } from "../../utils/icons.jsx";

function CategoryChart({catSums, maxSum, budgets, getBudgetForMonth, year, month}) {
  const [chartOpen, setChartOpen] = React.useState(false);
  const [view, setView] = React.useState("bar");
  const [hovered, setHovered] = React.useState(null);
  const total = catSums.reduce((s,c)=>s+c.sum, 0);
  const COLORS = ["#4a9fd4","#e8a838","#e05c5c","#5cb85c","#9b59b6","#1abc9c","#e67e22","#3498db","#e91e63","#00bcd4","#f39c12","#2ecc71"];
  const pie = React.useMemo(()=>{
    let angle = -Math.PI/2;
    return catSums.map((c,i)=>{
      const frac = c.sum / total;
      const start = angle;
      angle += frac * 2 * Math.PI;
      const end = angle;
      const large = (end-start) > Math.PI ? 1 : 0;
      const R = 150, cx = 160, cy = 160;
      const x1 = cx + R*Math.cos(start), y1 = cy + R*Math.sin(start);
      const x2 = cx + R*Math.cos(end),   y2 = cy + R*Math.sin(end);
      const mid = start + (end-start)/2;
      const pct = Math.round(frac*100);
      const labelR = pct >= 8 ? 100 : 128;
      const lx = cx + labelR*Math.cos(mid);
      const ly = cy + labelR*Math.sin(mid);
      return {cat:c, frac, pct, color: c.color || COLORS[i%COLORS.length],
        path:`M${cx},${cy} L${x1},${y1} A${R},${R} 0 ${large},1 ${x2},${y2} Z`, lx, ly};
    });
  }, [catSums, total]);
  return (
    <div style={{margin:"0 0 4px",borderRadius:12,overflow:"hidden",border:`1px solid ${T.bd}`}}>
      <div onClick={()=>setChartOpen(v=>!v)}
        style={{display:"flex",alignItems:"center",gap:6,padding:"7px 10px",
          cursor:"pointer",background:"rgba(255,255,255,0.03)"}}>
        {Li("bar-chart-2",13,T.txt2)}
        <span style={{flex:1,color:T.txt2,fontSize:11,fontWeight:600}}>Ausgaben nach Kategorie</span>
        {Li(chartOpen?"chevron-up":"chevron-down",12,T.txt2)}
      </div>
      {chartOpen&&<>
        <div style={{display:"flex",gap:6,padding:"6px 10px 2px",borderTop:`1px solid ${T.bd}`}}>
          {[["bar","bar-chart-2","Balken"],["pie","pie-chart","Torte"]].map(([v,icon,label])=>(
            <button key={v} onClick={()=>setView(v)}
              style={{display:"flex",alignItems:"center",gap:4,padding:"3px 10px",
                borderRadius:8,border:`1px solid ${view===v?T.blue:T.bd}`,
                background:view===v?`${T.blue}18`:"transparent",
                color:view===v?T.blue:T.txt2,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>
              {Li(icon,11,view===v?T.blue:T.txt2)} {label}
            </button>
          ))}
        </div>
        {view==="bar"&&<ChartBlock catSums={catSums} maxSum={maxSum} budgets={budgets} getBudgetForMonth={getBudgetForMonth} year={year} month={month}/>}
        {view==="pie"&&(
          <div style={{padding:"0 0 8px"}}>
            <svg viewBox="0 0 320 320" style={{width:"100%",display:"block"}}
              onMouseLeave={()=>setHovered(null)}>
              {pie.map((seg,i)=>(
                <path key={i} d={seg.path} fill={seg.color}
                  opacity={hovered===null||hovered===i ? 0.88 : 0.35}
                  stroke={T.bg} strokeWidth={2}
                  style={{cursor:"pointer",transition:"opacity 0.15s"}}
                  onMouseEnter={()=>setHovered(i)}
                  onTouchStart={()=>setHovered(hovered===i?null:i)}/>
              ))}
              <circle cx={160} cy={160} r={62} fill={T.surf2||T.surf}/>
              {hovered===null ? (<>
                <text x={160} y={153} textAnchor="middle" fill={T.txt2} fontSize={10}>Gesamt</text>
                <text x={160} y={169} textAnchor="middle" fill={T.txt} fontSize={13} fontWeight="800">{fmt(total)}</text>
              </>) : (<>
                <text x={160} y={149} textAnchor="middle" fill={pie[hovered]?.color} fontSize={9} fontWeight="700">{pie[hovered]?.cat.name}</text>
                <text x={160} y={164} textAnchor="middle" fill={T.txt} fontSize={13} fontWeight="800">{fmt(pie[hovered]?.cat.sum)}</text>
                <text x={160} y={177} textAnchor="middle" fill={T.txt2} fontSize={10}>{pie[hovered]?.pct}%</text>
              </>)}
              {pie.map((seg,i)=>{
                if(seg.pct < 4) return null;
                const isHov = hovered===i;
                const op = hovered===null||isHov ? 1 : 0.4;
                if(seg.pct >= 8) return (
                  <g key={"l"+i} style={{pointerEvents:"none"}}>
                    <text x={seg.lx} y={seg.ly-10} textAnchor="middle"
                      fill="#fff" fontSize={seg.pct>=15?10:8.5} fontWeight="700" opacity={op}>
                      {seg.cat.name.length>10 ? seg.cat.name.slice(0,9)+"\u2026" : seg.cat.name}
                    </text>
                    <text x={seg.lx} y={seg.ly+3} textAnchor="middle"
                      fill="#fff" fontSize={seg.pct>=15?9.5:8} fontWeight="600" opacity={op*0.95}>
                      {fmt(seg.cat.sum)}
                    </text>
                    <text x={seg.lx} y={seg.ly+15} textAnchor="middle"
                      fill="#fff" fontSize={7.5} opacity={op*0.75}>
                      {seg.pct}%
                    </text>
                  </g>
                );
                return (
                  <g key={"l"+i} style={{pointerEvents:"none"}}>
                    <text x={seg.lx} y={seg.ly} textAnchor="middle"
                      fill={seg.color} fontSize={8} fontWeight="700" opacity={op}>
                      {seg.pct}%
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        )}
      </>}
    </div>
  );
}

export { CategoryChart };
