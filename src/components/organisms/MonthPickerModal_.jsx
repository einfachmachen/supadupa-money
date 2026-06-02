// Auto-generated module (siehe app-src.jsx)

import React, { useEffect, useRef, useState } from "react";
import { MonthPicker } from "../molecules/MonthPicker.jsx";
import { theme as T } from "../../theme/activeTheme.js";
import { Li } from "../../utils/icons.jsx";

function MonthPickerModal({year, month, setYear, setMonth, onClose, onSwitchToMore}) {
  const MONTHS_S_LOCAL = ["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"];
  const isLightTheme = (T.themeName==="light"||T.themeName==="ios"||T.themeName==="material"||T.themeName==="paper"||T.themeName==="dkb"||T.themeName==="sand"||T.themeName==="clean"||T.themeName==="brutalist"||T.themeName==="swiss");
  const arrowBtn = {
    background: isLightTheme?"#fff":T.surf3,
    border: isLightTheme?`1px solid ${T.bds}`:"none",
    color:T.blue,
    borderRadius:10, width:36, height:36, fontSize:16, cursor:"pointer",
    display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,
    fontFamily:"inherit"
  };
  // Optimistic State: zeigt sofort den getippten Monat als ausgewählt,
  // bevor der schwere App-Re-Render einsetzt.
  const [pendingMonth, setPendingMonth] = React.useState(null);
  // Lokaler Year-State: wird sofort gerendert, App-State wird in Transition gesetzt.
  // So bleibt das Modal flüssig auch wenn der Hauptcontent im Hintergrund neu rechnet.
  const [pendingYear, setPendingYear] = React.useState(year);
  // Sync wenn App-Year sich extern ändert (z.B. durch Master-Button-Drag)
  React.useEffect(()=>{ setPendingYear(year); }, [year]);
  const handleMonthTap = (i) => {
    setPendingMonth(i);
    // setMonth als Transition + onClose als urgent.
    // startTransition markiert den teuren Hauptcontent-Re-Render als unterbrechbar,
    // sodass die Bottom-Bar während der Berechnung interaktiv bleibt.
    requestAnimationFrame(()=>{
      requestAnimationFrame(()=>{
        React.startTransition(()=>{
          // pendingYear ist evtl. von App-year abweichend (User hat Pfeile gedrückt)
          if(pendingYear !== year) setYear(pendingYear);
          setMonth(i);
        });
        onClose();
      });
    });
  };
  const handleYearStep = (delta) => {
    const newYear = pendingYear + delta;
    setPendingYear(newYear);  // sofortiges visuelles Feedback im Modal
    React.startTransition(()=>setYear(newYear));  // App-State als Transition
  };
  const displayedMonth = pendingMonth !== null ? pendingMonth : month;

  // TOGGLE-GESTE auf Backdrop:
  // - Swipe-Up   → MonthPicker schließen
  // - Swipe-Down → MonthPicker schließen + Mehr öffnen (über onSwitchToMore)
  // - Tap auf Backdrop → schließen (separat über onClick)
  const swipeRef = React.useRef({x:0,y:0,active:false,handled:false});
  const SWIPE_THR = 30;
  const onBdDown = (e) => {
    if(e.button !== undefined && e.button !== 0) return;
    swipeRef.current = {x:e.clientX, y:e.clientY, active:true, handled:false};
  };
  const onBdMove = (e) => {
    const s = swipeRef.current;
    if(!s.active || s.handled) return;
    const dy = e.clientY - s.y;
    const dx = e.clientX - s.x;
    if(Math.abs(dy) > SWIPE_THR && Math.abs(dy) > Math.abs(dx)) {
      s.handled = true;
      if(dy < 0) onClose();
      else { if(onSwitchToMore) onSwitchToMore(); else onClose(); }
    }
  };
  const onBdUp = () => { swipeRef.current.active = false; };
  return (
    <div onClick={(e)=>{ if(!swipeRef.current.handled) onClose(); }}
      onPointerDown={onBdDown}
      onPointerMove={onBdMove}
      onPointerUp={onBdUp}
      onPointerCancel={onBdUp}
      style={{position:"fixed",inset:0,zIndex:1100,background:"transparent",
        display:"flex",alignItems:"flex-end",justifyContent:"center",
        paddingBottom:"calc(env(safe-area-inset-bottom, 0px) + 80px)",
        pointerEvents:"auto", touchAction:"none"}}>
      <div onClick={e=>e.stopPropagation()}
        onPointerDown={e=>e.stopPropagation()}
        onPointerMove={e=>e.stopPropagation()}
        onPointerUp={e=>e.stopPropagation()}
        style={{background:T.surf, border:`1px solid ${T.bds}`,
          borderRadius:20, padding:"16px 16px 18px",
          width:"calc(100% - 24px)", maxWidth:380,
          boxShadow:"0 -10px 40px rgba(0,0,0,0.6)"}}>
        {/* Jahr-Wähler */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
          <button onClick={()=>handleYearStep(-1)} style={arrowBtn}>{Li("chevron-left",18)}</button>
          <span style={{color:T.txt,fontWeight:800,fontSize:20,letterSpacing:-0.3}}>{pendingYear}</span>
          <button onClick={()=>handleYearStep(1)} style={arrowBtn}>{Li("chevron-right",18)}</button>
        </div>
        {/* Monats-Grid */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6}}>
          {MONTHS_S_LOCAL.map((m,i)=>{
            const isSelected = i===displayedMonth && pendingYear===year;
            return (
              <button key={i}
                onClick={()=>handleMonthTap(i)}
                style={{padding:"12px 4px",borderRadius:10,border:"none",cursor:"pointer",
                  fontSize:13,fontWeight:700,fontFamily:"inherit",
                  background: isSelected ? "rgba(74,159,212,0.35)" : (isLightTheme?"rgba(0,0,0,0.04)":"rgba(255,255,255,0.05)"),
                  color: isSelected ? T.blue : T.txt2,
                  transition:"background 0.12s"}}>
                {m}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export { MonthPickerModal };
