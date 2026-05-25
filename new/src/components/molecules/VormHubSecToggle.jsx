// Auto-generated module (siehe app-src.jsx)

import React from "react";
import { theme as T } from "../../theme/activeTheme.js";
import { Li } from "../../utils/icons.jsx";

function VormHubSecToggle({label, icon, active, onToggle, accent}) {
  return (
    <div onClick={onToggle} style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",
      padding:"11px 14px",borderBottom:`1px solid ${T.bd}`,userSelect:"none",
      background:active?((T.themeName==="light"||T.themeName==="ios"||T.themeName==="material"||T.themeName==="paper"||T.themeName==="dkb"||T.themeName==="sand"||T.themeName==="clean"||T.themeName==="brutalist"||T.themeName==="swiss")?"rgba(170,204,0,0.06)":"rgba(170,204,0,0.04)"):"transparent"}}>
      <div style={{width:28,height:28,borderRadius:9,
        background:active?`${accent||T.pos}22`:"rgba(255,255,255,0.06)",
        display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
        {Li(icon,14,active?accent||T.pos:T.txt2)}
      </div>
      <span style={{flex:1,fontSize:13,fontWeight:600,color:active?T.txt:T.txt2}}>{label}</span>
      <div style={{width:36,height:20,borderRadius:10,position:"relative",flexShrink:0,
        background:active?T.pos:"rgba(255,255,255,0.2)",transition:"background 0.2s"}}>
        <div style={{position:"absolute",top:3,left:active?16:3,width:14,height:14,
          borderRadius:"50%",background:"#fff",transition:"left 0.2s",
          boxShadow:"0 1px 3px rgba(0,0,0,0.3)"}}/>
      </div>
    </div>
  );
}

export { VormHubSecToggle };
