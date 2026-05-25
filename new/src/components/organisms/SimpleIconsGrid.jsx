// Auto-generated module (siehe app-src.jsx)

import React, { useEffect, useState } from "react";
import { theme as T } from "../../theme/activeTheme.js";
import { SIMPLE_ICONS } from "../../utils/icons.jsx";

function SimpleIconsGrid({selectedIcon, selectedColor, onSelect}) {
  const [svgs, setSvgs] = React.useState({});
  const col = selectedColor || T.blue;

  React.useEffect(()=>{
    SIMPLE_ICONS.forEach(({slug})=>{
      if(svgs[slug]) return;
      fetch(`https://cdn.jsdelivr.net/npm/simple-icons@v13/icons/${slug}.svg`)
        .then(r=>r.text())
        .then(text=>{
          // Farbe auf aktuell setzen
          const colored = text.replace(/fill="[^"]*"/g,'').replace('<svg','<svg fill="currentColor"');
          setSvgs(p=>({...p,[slug]:colored}));
        })
        .catch(()=>{});
    });
  },[]);

  return (
    <div style={{flex:1,overflowY:"auto",display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,padding:4}}>
      {SIMPLE_ICONS.map(({slug,label})=>(
        <button key={slug} onClick={()=>onSelect("si:"+slug)} title={label}
          style={{borderRadius:10,border:selectedIcon==="si:"+slug?`2px solid ${col}`:`1px solid rgba(255,255,255,0.1)`,
            background:selectedIcon==="si:"+slug?col+"22":T.surf,
            cursor:"pointer",padding:"8px 4px",display:"flex",flexDirection:"column",
            alignItems:"center",gap:4,minWidth:0}}>
          {svgs[slug]
            ? <span style={{width:24,height:24,display:"flex",alignItems:"center",justifyContent:"center",
                color:selectedIcon==="si:"+slug?col:T.txt2,flexShrink:0}}
                dangerouslySetInnerHTML={{__html:svgs[slug].replace(/width="[^"]*"/,'width="24"').replace(/height="[^"]*"/,'height="24"')}}/>
            : <span style={{width:24,height:24,display:"flex",alignItems:"center",justifyContent:"center",opacity:0.3}}>…</span>
          }
          <span style={{fontSize:8,color:T.txt2,textAlign:"center",overflow:"hidden",
            textOverflow:"ellipsis",whiteSpace:"nowrap",width:"100%",padding:"0 2px"}}>{label}</span>
        </button>
      ))}
    </div>
  );
}

export { SimpleIconsGrid };
