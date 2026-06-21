// Auto-generated module (siehe app-src.jsx)

import React, { useMemo, useState } from "react";
import { theme as T } from "../../theme/activeTheme.js";
import { THEMES } from "../../theme/themes.js";
import { kvStore } from "../../utils/kvStore.js";

function ThemeDropdown({themeName, setThemeName}) {
  const [thOpen, setThOpen] = React.useState(false);
  const toH = c => { if(!c)return"#888"; if(c.startsWith("#"))return c.slice(0,7); const m=c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/); return m?"#"+[m[1],m[2],m[3]].map(n=>parseInt(n).toString(16).padStart(2,"0")).join(""):"#888"; };
  // Helligkeit (0..1) aus dem Hintergrund → hell/dunkel-Einteilung.
  const luma = c => { const h=toH(c); const r=parseInt(h.slice(1,3),16)||0, g=parseInt(h.slice(3,5),16)||0, b=parseInt(h.slice(5,7),16)||0; return (0.299*r+0.587*g+0.114*b)/255; };
  const groups = React.useMemo(()=>{
    const saved = (() => { try { return JSON.parse(kvStore.getItem("mbt_custom_themes")||"{}"); } catch{return {};} })();
    Object.entries(saved).forEach(([k,v])=>{ if(!THEMES[k]) THEMES[k]=v; });
    const list = Object.entries(THEMES)
      .filter(([k])=>k!=="custom_preview")
      .map(([k,v])=>({ key:k, name:v.name||k, bg:v.bg, blue:v.blue, pos:v.pos, neg:v.neg, lum:luma(v.bg) }));
    // Gruppieren: Dunkel zuerst, dann Hell. Innerhalb als Helligkeits-Verlauf
    // (dunkel: dunkelste zuerst, hell: hellste zuerst).
    return {
      dark:  list.filter(t=>t.lum < 0.5).sort((a,b)=>a.lum-b.lum),
      light: list.filter(t=>t.lum >= 0.5).sort((a,b)=>b.lum-a.lum),
    };
  }, [themeName]);
  const cur = THEMES[themeName] || THEMES.dark;
  const renderItem = ({key,name,bg,blue,pos,neg}) => {
    const active = key===themeName;
    return (
      <div key={key} onClick={()=>{setThemeName(key);kvStore.setItem("mbt_theme",key);setThOpen(false);}}
        style={{display:"flex",alignItems:"center",gap:8,padding:"7px 12px",cursor:"pointer",
          background:active?`${T.blue}18`:"transparent",
          borderLeft:active?`3px solid ${T.blue}`:"3px solid transparent"}}>
        <div style={{display:"flex",gap:3,flexShrink:0}}>
          {[bg,blue,pos,neg].map((c,i)=>(
            <div key={i} style={{width:10,height:10,borderRadius:"50%",background:toH(c),border:"1px solid rgba(128,128,128,0.25)"}}/>
          ))}
        </div>
        <span style={{fontSize:12,color:active?T.blue:T.txt,fontWeight:active?700:400,flex:1,
          overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{name}</span>
        {active&&<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={T.blue} strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>}
      </div>
    );
  };
  const sectionHdr = (label, count) => (
    <div style={{display:"flex",alignItems:"center",gap:6,padding:"6px 12px 3px",
      fontSize:10,fontWeight:800,letterSpacing:"0.08em",textTransform:"uppercase",color:T.txt2}}>
      {label} <span style={{opacity:0.6,fontWeight:600}}>({count})</span>
    </div>
  );
  return (
    <div style={{position:"relative",flexShrink:0}}>
      <button onClick={()=>setThOpen(o=>!o)}
        style={{display:"flex",alignItems:"center",justifyContent:"center",gap:2,
          background:thOpen?`${T.blue}22`:"rgba(255,255,255,0.06)",
          border:`1px solid ${thOpen?T.blue:T.bd}`,
          borderRadius:9,padding:"5px 7px",cursor:"pointer",height:30,
          flexShrink:0}}>
        {[cur.bg,cur.blue,cur.pos,cur.neg].map((c,i)=>(
          <div key={i} style={{width:8,height:8,borderRadius:"50%",background:toH(c),
            border:"1px solid rgba(128,128,128,0.3)"}}/>
        ))}
      </button>
      {thOpen&&(
        <>
          <div onClick={()=>setThOpen(false)} style={{position:"fixed",inset:0,zIndex:49}}/>
          <div style={{position:"absolute",top:"calc(100% + 6px)",right:0,zIndex:50,
            background:T.surf,border:`1px solid ${T.bds}`,borderRadius:13,
            boxShadow:"0 8px 32px rgba(0,0,0,0.45)",backdropFilter:"blur(12px)",
            minWidth:200,maxHeight:320,overflowY:"auto",padding:"5px 0"}}>
            {sectionHdr("Dunkel", groups.dark.length)}
            {groups.dark.map(renderItem)}
            {sectionHdr("Hell", groups.light.length)}
            {groups.light.map(renderItem)}
          </div>
        </>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════

export { ThemeDropdown };
