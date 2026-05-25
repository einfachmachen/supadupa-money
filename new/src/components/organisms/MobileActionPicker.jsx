// Auto-generated module (siehe app-src.jsx)

import React, { useRef, useState } from "react";
import { MonthPicker } from "../molecules/MonthPicker.jsx";
import { MobileVormerkenModal } from "./MobileVormerkenModal.jsx";
import { theme as T } from "../../theme/activeTheme.js";
import { Li } from "../../utils/icons.jsx";

function MobileActionPicker({onClose, onSelect, onSwitchToMonth}) {
  const fs = 26;
  const [screen, setScreen] = React.useState("main");
  const isDaten = screen==="daten";

  // TOGGLE-GESTE auf Header:
  // - Swipe-Up   → Mehr schließen + MonthPicker öffnen (onSwitchToMonth)
  // - Swipe-Down → Mehr schließen
  const swipeRef = React.useRef({x:0,y:0,active:false,handled:false});
  const SWIPE_THR = 30;
  const swipeHandlers = {
    onPointerDown: (e) => {
      if(e.button !== undefined && e.button !== 0) return;
      swipeRef.current = {x:e.clientX, y:e.clientY, active:true, handled:false};
    },
    onPointerMove: (e) => {
      const s = swipeRef.current;
      if(!s.active || s.handled) return;
      const dy = e.clientY - s.y;
      const dx = e.clientX - s.x;
      if(Math.abs(dy) > SWIPE_THR && Math.abs(dy) > Math.abs(dx)) {
        s.handled = true;
        if(dy < 0) { if(onSwitchToMonth) onSwitchToMonth(); else onClose(); }
        else onClose();
      }
    },
    onPointerUp: () => { swipeRef.current.active = false; },
    onPointerCancel: () => { swipeRef.current.active = false; },
  };

  const mainActions = [
    {id:"daten",        label:"Daten-Manager",       icon:"database",    color:T.pos},
    {id:"vormerken",    label:"vormerken",           icon:"calendar",    color:T.gold},
    {id:"matching",     label:"zuordnen",            icon:"git-merge",   color:T.blue},
    {id:"wiederkehrend",label:"Serien",              icon:"repeat",      color:T.blue},
    {id:"finanzierung", label:"Finanzierungen",      icon:"credit-card", color:T.txt2},
    {id:"kategorien",   label:"Kategorien & Budgets",icon:"tag",         color:T.blue},
    {id:"einstellungen",label:"Einstellungen",       icon:"settings",    color:T.txt2},
    {id:"desktop",      label:"Desktop-Modal",       icon:"monitor",     color:T.txt2},
  ];







  const datenActions = [
    {id:"csv",       label:"CSV importieren", icon:"download",    color:T.pos,  sub:"Buchungen aus Banking-App"},
    {id:"datenmgr",  label:"Daten-Manager",   icon:"database",    color:T.pos,  sub:"Export / Import / Löschen"},
    {id:"jsonladen", label:"JSON laden",       icon:"folder-open", color:T.blue, sub:"Backup-Datei einspielen"},
  ];
  const actions = isDaten ? datenActions : mainActions;

  // ── TERMINAL ────────────────────────────────────────────────────────────
  if(T.themeName==="terminal") {
    const G=T.pos, D=T.txt2, A=T.txt;
    const shortcuts = {csv:"1",vormerken:"2",wiederkehrend:"3",finanzierung:"4",kategorien:"5"};
    return (
      <div style={{position:"fixed",inset:0,background:"#0D0D0D",zIndex:300,
        display:"flex",flexDirection:"column",fontFamily:"monospace"}}>
        {/* Header */}
        <div {...swipeHandlers} style={{background:"#111",borderBottom:`2px solid ${G}`,
          padding:"10px 12px",display:"flex",alignItems:"center",gap:10,flexShrink:0,touchAction:"none"}}>
          <button onClick={onClose}
            style={{background:"transparent",border:`1px solid ${G}44`,color:G,
              width:40,height:40,cursor:"pointer",fontSize:16,fontFamily:"monospace",
              display:"flex",alignItems:"center",justifyContent:"center"}}>
            ✕
          </button>
          <div style={{flex:1}}>
            <div style={{color:G,fontSize:14,fontWeight:700,letterSpacing:1}}>
              {">"} AKTION WÄHLEN
            </div>
            <div style={{color:D,fontSize:10,marginTop:2}}>{"// tippe 1-5 oder wähle unten"}</div>
          </div>
        </div>
        {/* Box */}
        <div style={{flex:1,overflowY:"auto",padding:"12px 8px"}}>
          <div style={{color:D,fontSize:11,marginBottom:4}}>{"┌"+"─".repeat(42)+"┐"}</div>
          {actions.map(({id,label,icon,sub},i)=>(
            <div key={id}>
              <button onClick={()=>onSelect(id)}
                style={{width:"100%",background:"transparent",border:"none",
                  cursor:"pointer",padding:0,display:"flex",fontFamily:"monospace",
                  WebkitTapHighlightColor:"transparent"}}>
                <span style={{color:D,fontSize:11,lineHeight:"2"}}>│ </span>
                <span style={{color:G,fontSize:11,minWidth:14,lineHeight:"2"}}>{shortcuts[id]}.</span>
                <span style={{color:A,fontSize:14,fontWeight:700,flex:1,textAlign:"left",
                  lineHeight:"2"}}>{label.toUpperCase()}</span>
                <span style={{color:D,fontSize:10,lineHeight:"2",paddingRight:2}}>{">"}</span>
                <span style={{color:D,fontSize:11,lineHeight:"2"}}> │</span>
              </button>
              <div style={{color:D,fontSize:11,paddingLeft:4}}>
                {"│   "}<span style={{color:D,fontSize:9}}>{sub}</span>
                {"                        ".slice(sub.length)}{"│"}
              </div>
              {i<actions.length-1&&<div style={{color:D,fontSize:11}}>{"├"+"─".repeat(42)+"┤"}</div>}
            </div>
          ))}
          <div style={{color:D,fontSize:11,marginTop:0}}>{"└"+"─".repeat(42)+"┘"}</div>
          {/* Direct new tx */}
          <button onClick={()=>onSelect("addTx")}
            style={{width:"100%",marginTop:12,background:"transparent",
              border:`1px solid ${G}`,color:G,fontSize:13,fontWeight:700,
              fontFamily:"monospace",padding:"10px",cursor:"pointer",
              letterSpacing:1}}>
            {">"} NEUE BUCHUNG DIREKT
          </button>
        </div>
      </div>
    );
  }

  // ── BRUTALIST ────────────────────────────────────────────────────────────
  if(T.themeName==="brutalist") {
    const BK="#000", BY="#FFEC3E", BR="#CC0000";
    return (
      <div style={{position:"fixed",inset:0,background:BY,zIndex:300,
        display:"flex",flexDirection:"column"}}>
        {/* Header */}
        <div {...swipeHandlers} style={{background:BK,padding:"10px 12px",
          display:"flex",alignItems:"center",gap:10,flexShrink:0,
          borderBottom:`4px solid ${BK}`,touchAction:"none"}}>
          <button onClick={onClose}
            style={{background:BY,border:`3px solid ${BY}`,color:BK,
              width:44,height:44,cursor:"pointer",fontSize:20,fontWeight:900,
              display:"flex",alignItems:"center",justifyContent:"center"}}>
            ✕
          </button>
          <div style={{color:BY,fontSize:20,fontWeight:900,letterSpacing:1,flex:1}}>
            WAS TUN?
          </div>
        </div>
        {/* Action Grid */}
        <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:0}}>
          {/* Direct tx — top, biggest */}
          <button onClick={()=>onSelect("addTx")}
            style={{width:"100%",background:BK,border:"none",
              borderBottom:`4px solid ${BK}`,
              padding:"18px 16px",cursor:"pointer",
              display:"flex",alignItems:"center",gap:12,
              WebkitTapHighlightColor:"transparent"}}>
            <span style={{background:BY,color:BK,fontSize:28,fontWeight:900,
              width:52,height:52,display:"flex",alignItems:"center",justifyContent:"center",
              flexShrink:0}}>+</span>
            <div style={{textAlign:"left"}}>
              <div style={{color:BY,fontSize:22,fontWeight:900}}>NEUE BUCHUNG</div>
              <div style={{color:"rgba(255,236,62,0.6)",fontSize:11,marginTop:2}}>direkt erfassen</div>
            </div>
          </button>
          {/* 2-column grid for other actions */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:0}}>
            {actions.map(({id,label,icon,color,sub},i)=>(
              <button key={id} onClick={()=>onSelect(id)}
                style={{
                  background:i%2===0?"#FFEC3E":"#F5E800",
                  border:`3px solid ${BK}`,
                  borderTop:"none",
                  borderLeft:i%2===1?`3px solid ${BK}`:"none",
                  padding:"14px 12px",cursor:"pointer",
                  display:"flex",flexDirection:"column",gap:6,
                  textAlign:"left",
                  WebkitTapHighlightColor:"transparent"}}>
                <div style={{width:36,height:36,background:BK,
                  display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  {Li(icon,18,BY)}
                </div>
                <div style={{color:BK,fontSize:14,fontWeight:900,lineHeight:1.2}}>
                  {label.toUpperCase()}
                </div>
                <div style={{color:"rgba(0,0,0,0.5)",fontSize:10}}>{sub}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── DEFAULT ───────────────────────────────────────────────────────────────
  return (
    <div style={{position:"fixed",inset:0,background:T.bg,zIndex:300,
      display:"flex",flexDirection:"column"}}>

      {/* Header */}
      <div {...swipeHandlers} style={{background:T.surf,borderBottom:`1px solid ${T.bd}`,
        padding:"12px 16px",display:"flex",alignItems:"center",gap:12,flexShrink:0,touchAction:"none"}}>
        <button onClick={isDaten ? ()=>setScreen("main") : onClose}
          style={{background:"rgba(255,255,255,0.08)",border:"none",color:T.txt2,
            width:44,height:44,borderRadius:14,cursor:"pointer",fontSize:20,
            display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
          {isDaten ? Li("arrow-left",22,T.txt) : "✕"}
        </button>
        <div style={{flex:1}}>
          <div style={{color:T.txt,fontSize:fs+2,fontWeight:700}}>
            {isDaten ? "Daten" : "Was möchtest du tun?"}
          </div>
          {isDaten&&<div style={{color:T.txt2,fontSize:fs-10,marginTop:2}}>Import, Export & Verwaltung</div>}
        </div>
      </div>

      {/* Aktionen */}
      <div style={{flex:1,overflowY:"auto",padding:"6px 8px",WebkitOverflowScrolling:"touch"}}>
        {actions.map(({id,label,icon,color})=>(
          <button key={id} onClick={()=>id==="daten" ? setScreen("daten") : onSelect(id)}
            style={{width:"100%",padding:"6px 8px",borderRadius:10,
              border:`1px solid ${T.bd}`,
              background:"rgba(255,255,255,0.04)",
              display:"flex",alignItems:"center",gap:8,
              marginBottom:4,cursor:"pointer",fontFamily:"inherit",
              textAlign:"left",WebkitTapHighlightColor:"transparent"}}>
            <div style={{width:30,height:30,borderRadius:8,flexShrink:0,
              background:color+"22",
              display:"flex",alignItems:"center",justifyContent:"center"}}>
              {Li(icon,18,color)}
            </div>
            <div style={{flex:1,color:T.txt,fontSize:fs-2,fontWeight:700}}>{label}</div>
            <span style={{color:T.txt2,fontSize:fs-2,flexShrink:0}}>›</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// MobileVormerkenModal — Schritt-für-Schritt Vormerkung für iPhone

export { MobileActionPicker };
