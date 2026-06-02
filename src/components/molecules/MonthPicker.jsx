// Auto-generated module (siehe app-src.jsx)

import React, { useEffect, useRef, useState } from "react";
import { InlineCatSelect } from "./InlineCatSelect.jsx";
import { theme as T } from "../../theme/activeTheme.js";
import { MONTHS_S } from "../../utils/constants.js";
import { Li } from "../../utils/icons.jsx";

function MonthPicker({month, year, onMonth, onYear, yearOnly=false}) {
  const [open, setOpen] = useState(false);
  const [pickYear, setPickYear] = useState(year);
  const ref = useRef(null);

  useEffect(()=>{
    if(!open) return;
    const fn = e=>{ if(ref.current&&!ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown",fn);
    return ()=>document.removeEventListener("mousedown",fn);
  },[open]);

  const prevM = ()=>{ if(month>0){onMonth(month-1);}else{onMonth(11);onYear(year-1);} };
  const nextM = ()=>{ if(month<11){onMonth(month+1);}else{onMonth(0);onYear(year+1);} };

  const isLightTheme = (T.themeName==="light"||T.themeName==="ios"||T.themeName==="material"||T.themeName==="paper"||T.themeName==="dkb"||T.themeName==="sand"||T.themeName==="clean"||T.themeName==="brutalist"||T.themeName==="swiss");
  const btnS = {
    background: isLightTheme?"#fff":T.surf3,
    border: isLightTheme?`1px solid ${T.bds}`:"none",
    color:T.blue,
    borderRadius:8, width:32, height:32, fontSize:16, cursor:"pointer",
    display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,
    boxShadow: isLightTheme?"0 1px 3px rgba(0,0,0,0.12)":"none",
  };

  return (
    <div ref={ref} style={{position:"relative",display:"inline-flex",alignItems:"center",gap:3}}>
      <button onClick={yearOnly?()=>onYear(year-1):prevM} style={btnS}>{Li("chevron-left",16)}</button>
      {/* Label: klickbar → Dropdown */}
      <span onClick={()=>{setPickYear(year);setOpen(o=>!o);}}
        style={{
          background: isLightTheme?"#fff":T.surf3,
          borderRadius:8, padding:"4px 12px",
          color:T.txt, fontWeight:700, fontSize:14, cursor:"pointer",
          userSelect:"none", textAlign:"center", whiteSpace:"nowrap",
          border:`1px solid ${open?T.blue:isLightTheme?T.bds:"transparent"}`,
          boxShadow: isLightTheme?"0 1px 3px rgba(0,0,0,0.12)":"none",
          transition:"border-color 0.15s",
          minWidth: yearOnly?46:88}}>
        {yearOnly ? year : `${MONTHS_S[month]} ${year}`}
      </span>
      <button onClick={yearOnly?()=>onYear(year+1):nextM} style={btnS}>{Li("chevron-right",16)}</button>

      {/* Dropdown — öffnet nach unten (jetzt in der Titelleiste) */}
      {open&&(
        <div style={{position:"absolute",top:"110%",right:0,zIndex:200,
          background:(T.themeName==="light"||T.themeName==="ios"||T.themeName==="material"||T.themeName==="paper"||T.themeName==="dkb"||T.themeName==="sand"||T.themeName==="clean"||T.themeName==="brutalist"||T.themeName==="swiss")?"#fff":T.surf2,
          border:`1px solid ${T.bds}`,borderRadius:14,
          padding:12,
          boxShadow:(T.themeName==="light"||T.themeName==="ios"||T.themeName==="material"||T.themeName==="paper"||T.themeName==="dkb"||T.themeName==="sand"||T.themeName==="clean"||T.themeName==="brutalist"||T.themeName==="swiss")?"0 -4px 24px rgba(0,0,0,0.15)":"0 -8px 32px rgba(0,0,0,0.6)",
          minWidth:200}}>
          {/* Jahr-Wähler */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
            <button onClick={()=>setPickYear(y=>y-1)}
              style={{...btnS,width:26,height:26}}>{Li("chevron-left",14)}</button>
            <span style={{color:T.txt,fontWeight:700,fontSize:14}}>{pickYear}</span>
            <button onClick={()=>setPickYear(y=>y+1)}
              style={{...btnS,width:26,height:26}}>{Li("chevron-right",14)}</button>
          </div>
          {/* Heute-Button */}
          {!yearOnly&&(
            <button onClick={()=>{
              const now=new Date();
              onMonth(now.getMonth());onYear(now.getFullYear());setOpen(false);
            }}
              style={{width:"100%",padding:"5px",borderRadius:8,border:`1px solid ${T.blue}44`,
                background:"rgba(74,159,212,0.1)",color:T.blue,
                fontSize:11,fontWeight:700,cursor:"pointer",marginBottom:8}}>
              Heute ({MONTHS_S[new Date().getMonth()]} {new Date().getFullYear()})
            </button>
          )}
          {/* Monats-Grid */}
          {!yearOnly&&(
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:4}}>
              {MONTHS_S.map((m,i)=>(
                <button key={i} onClick={()=>{onMonth(i);onYear(pickYear);setOpen(false);}}
                  style={{padding:"6px 2px",borderRadius:8,border:"none",cursor:"pointer",
                    fontSize:11,fontWeight:700,
                    background:i===month&&pickYear===year?"rgba(74,159,212,0.35)":"rgba(255,255,255,0.05)",
                    color:i===month&&pickYear===year?T.blue:T.txt2}}>
                  {m}
                </button>
              ))}
            </div>
          )}
          {yearOnly&&(
            <button onClick={()=>{onYear(pickYear);setOpen(false);}}
              style={{width:"100%",padding:"8px",borderRadius:9,border:"none",
                background:T.blue,
                color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>
              {pickYear} übernehmen
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MATCHING SCREEN – Vormerkungen ↔ echte Buchungen zuordnen
// ══════════════════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════════
// InlineCatSelect — Kategorie-Auswahl mit Neu-anlegen-Option
// ══════════════════════════════════════════════════════════════════════

export { MonthPicker };
