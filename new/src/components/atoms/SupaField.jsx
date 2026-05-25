// Auto-generated module (siehe app-src.jsx)

import React, { useRef, useState } from "react";
import { EditPopup } from "../organisms/EditPopup.jsx";
import { VerknuepfenPanel } from "../organisms/VerknuepfenPanel.jsx";
import { theme as T } from "../../theme/activeTheme.js";
import { INP } from "../../theme/palette.js";
import { Li } from "../../utils/icons.jsx";

function SupaField({value, onChange, placeholder, locked, type="text"}) {
  const [unlocked, setUnlocked] = React.useState(false);
  const [showPw,   setShowPw]   = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const pressTimer = React.useRef(null);
  const progTimer  = React.useRef(null);
  const isLocked   = locked && !unlocked;
  const isPassword = type === "password";

  const startPress = () => {
    if(!isLocked) return;
    setProgress(0);
    let p = 0;
    progTimer.current = setInterval(()=>{ p+=4; setProgress(Math.min(p,100)); },40);
    pressTimer.current = setTimeout(()=>{
      clearInterval(progTimer.current);
      setProgress(0);
      setUnlocked(true);
    }, 1000);
  };
  const endPress = () => {
    clearTimeout(pressTimer.current);
    clearInterval(progTimer.current);
    setProgress(0);
  };

  const displayValue = isPassword && !showPw && value
    ? "•".repeat(Math.min(value.length, 32))
    : value;

  return (
    <div style={{position:"relative",marginBottom:6}}
      onMouseDown={startPress} onMouseUp={endPress} onMouseLeave={endPress}
      onTouchStart={startPress} onTouchEnd={endPress}>
      {/* Progress ring beim Long-Press */}
      {progress>0&&(
        <div style={{position:"absolute",inset:0,borderRadius:11,overflow:"hidden",zIndex:1,pointerEvents:"none"}}>
          <div style={{position:"absolute",bottom:0,left:0,height:3,
            width:`${progress}%`,background:T.gold,borderRadius:2,transition:"width 0.04s linear"}}/>
        </div>
      )}
      <div style={{position:"relative"}}>
        <input
          value={displayValue}
          onChange={e=>!isLocked&&onChange(e.target.value)}
          placeholder={placeholder}
          readOnly={isLocked}
          type={isPassword && !showPw ? "password" : "text"}
          autoComplete="off" autoCorrect="off" spellCheck="false"
          style={{...INP, marginBottom:0, fontSize:11,
            border:`1px solid ${locked&&!unlocked ? T.pos+"88" : unlocked ? T.gold+"88" : T.bd}`,
            background: locked&&!unlocked ? T.pos+"08" : unlocked ? T.gold+"08" : "rgba(255,255,255,0.05)",
            color: T.txt,
            cursor: isLocked ? "default" : "text",
            paddingRight: isPassword ? 52 : 28,
          }}
        />
        <div style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",
          display:"flex",alignItems:"center",gap:4}}>
          {isPassword&&(
            <button onClick={()=>setShowPw(v=>!v)}
              style={{background:"none",border:"none",cursor:"pointer",padding:2,
                color:showPw?T.blue:T.txt2,display:"flex",alignItems:"center"}}
              title={showPw?"passwort verbergen":"passwort anzeigen"}>
              {Li(showPw?"eye-off":"eye", 13, showPw?T.blue:T.txt2)}
            </button>
          )}
          {locked&&!unlocked ? Li("check-circle",13,T.pos) : unlocked ? Li("unlock",13,T.gold) : null}
        </div>
      </div>
      {isLocked&&(
        <div style={{color:T.txt2,fontSize:9,marginTop:2}}>
          {Li("lock",8,T.txt2)} Gedrückt halten zum Bearbeiten
        </div>
      )}
      {unlocked&&(
        <div style={{color:T.gold,fontSize:9,marginTop:2,display:"flex",alignItems:"center",gap:3}}>
          {Li("unlock",8,T.gold)} Entsperrt — nach Speichern wieder gesperrt
          <button onClick={()=>setUnlocked(false)}
            style={{marginLeft:"auto",background:"none",border:"none",color:T.txt2,fontSize:9,cursor:"pointer",padding:0}}>
            sperren
          </button>
        </div>
      )}
    </div>
  );
}

// ── VerknuepfenPanel: Buchung ↔ Vormerkung zuordnen (in EditPopup) ──

export { SupaField };
