// Auto-generated module (siehe app-src.jsx)

import React, { useState } from "react";
import { theme as T } from "../../theme/activeTheme.js";

const PRESET_COLORS = [
  "#FF6B6B",T.warn,"#F7C948","#A3E635","#34D399","#4ECDC4",
  "#60A5FA","#818CF8","#C084FC","#F472B6","#94A3B8","#FFFFFF",
  "#E05060","#FB923C","#FFD700","#84CC16","#10B981","#0EA5E9",
  "#6366F1","#A855F7","#EC4899","#64748B","#AACC00","#F5A623",
];

function ColorPickerPopup({onClose, onSelect}) {
  const [custom, setCustom] = React.useState("#FF6B6B");
  return (
    <div onClick={onClose}
      style={{position:"fixed",inset:0,zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.5)"}}>
      <div onClick={e=>e.stopPropagation()}
        style={{background:T.surf2,borderRadius:16,padding:16,width:240,boxShadow:"0 8px 32px rgba(0,0,0,0.6)",border:`1px solid ${T.bds}`}}>
        <div style={{color:T.txt,fontSize:13,fontWeight:700,marginBottom:10}}>Farbe wählen</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:8,marginBottom:12}}>
          {PRESET_COLORS.map(col=>(
            <button key={col} onClick={()=>{onSelect(col);onClose();}}
              style={{width:28,height:28,borderRadius:"50%",background:col,border:"2px solid transparent",cursor:"pointer",
                transition:"transform 0.1s"}}
              onMouseEnter={e=>e.currentTarget.style.transform="scale(1.2)"}
              onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}/>
          ))}
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <input type="color" value={custom} onChange={e=>setCustom(e.target.value)}
            style={{width:36,height:36,borderRadius:8,border:"none",cursor:"pointer",padding:0,background:"none"}}/>
          <span style={{color:T.txt2,fontSize:11,flex:1}}>Eigene Farbe</span>
          <button onClick={()=>{onSelect(custom);onClose();}}
            style={{background:T.blue,border:"none",borderRadius:8,padding:"5px 12px",color:"#000",fontSize:12,fontWeight:700,cursor:"pointer"}}>
            ✓
          </button>
        </div>
      </div>
    </div>
  );
}

// + öffnet nativen ColorPicker, Farbe wird als runder Punkt hinzugefügt.
// Einfacher Klick → wendet Farbe an (onSelect).
// Langer Druck → löscht. Drag & Drop → Reihenfolge ändern.
// Beim Klick auf eine bestehende Schnellwahl in einem "Farbwahl-Modus"
// (colorTarget gesetzt) wird die Farbe des Ziel-Icons geändert.
// ══════════════════════════════════════════════════════════════════════

export { PRESET_COLORS, ColorPickerPopup };
