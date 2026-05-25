// Auto-generated module (siehe app-src.jsx)

import React, { useState } from "react";
import { theme as T } from "../../theme/activeTheme.js";
import { Li } from "../../utils/icons.jsx";

function SubNameField({sub, cat, setCats, S, T}) {
  const [focused, setFocused] = React.useState(false);
  return (
    <div style={{flex:1,display:"flex",alignItems:"center",gap:4,minWidth:0}}>
      <input
        defaultValue={sub.name}
        style={{flex:1,background:focused?"rgba(255,255,255,0.06)":"transparent",
          border:focused?`1px solid ${T.blue}`:"1px solid transparent",
          borderRadius:6,
          color:T.txt,fontSize:S.fs,fontFamily:"inherit",
          outline:"none",padding:focused?"3px 7px":"3px 0",
          cursor:"text",minWidth:0,transition:"all 0.15s"}}
        onFocus={()=>setFocused(true)}
        onBlur={e=>{
          setFocused(false);
          const n=e.target.value.trim();
          if(n) setCats(p=>p.map(c=>c.id===cat.id?{...c,subs:c.subs.map(s=>s.id===sub.id?{...s,name:n}:s)}:c));
        }}
        onKeyDown={e=>{if(e.key==="Enter") e.target.blur();}}/>
      {focused&&(
        <button
          onMouseDown={e=>{
            e.preventDefault();
            if(window.confirm(`„${sub.name}" löschen?`))
              setCats(p=>p.map(c=>c.id===cat.id?{...c,subs:c.subs.filter(s=>s.id!==sub.id)}:c));
          }}
          style={{background:"none",border:"none",color:T.neg,
            cursor:"pointer",padding:"2px 4px",flexShrink:0}}>
          {Li("trash-2",S.fs-4,T.neg)}
        </button>
      )}
    </div>
  );
}

export { SubNameField };
