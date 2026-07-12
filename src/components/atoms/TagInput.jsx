// Wiederverwendbares Tag-Eingabefeld — Chips + Freitext-Eingabe mit "#"-Optik.
// Speicherformat: value ist ein Array von Kleinbuchstaben-Strings OHNE führendes
// "#" (z.B. ["aida","amazon"]); die Anzeige ergänzt das "#" nur visuell. So
// bleibt die Suche (utils/search.js) unabhängig davon, ob der Nutzer beim
// Eintippen ein "#" mitschreibt oder nicht.
import React, { useState } from "react";
import { theme as T } from "../../theme/activeTheme.js";
import { Li } from "../../utils/icons.jsx";

function normalizeTag(raw) {
  return (raw||"").trim().replace(/^#+/,"").toLowerCase().slice(0,40);
}

function TagInput({ value, onChange, placeholder="Tag hinzufügen…" }) {
  const tags = value||[];
  const [draft, setDraft] = useState("");

  const addTag = (raw) => {
    const t = normalizeTag(raw);
    if(!t || tags.includes(t)) { setDraft(""); return; }
    onChange([...tags, t]);
    setDraft("");
  };
  const removeTag = (t) => onChange(tags.filter(x=>x!==t));

  const onKeyDown = (e) => {
    if(e.key==="Enter" || e.key==="," || e.key===" ") { e.preventDefault(); addTag(draft); }
    else if(e.key==="Backspace" && !draft && tags.length) { removeTag(tags[tags.length-1]); }
  };

  return (
    <div style={{width:"100%",background:"rgba(255,255,255,0.05)",border:`1px solid ${T.bd}`,
      borderRadius:11,padding:"6px 8px",marginBottom:9,boxSizing:"border-box",
      display:"flex",flexWrap:"wrap",gap:6,alignItems:"center"}}>
      {tags.map(t=>(
        <span key={t} style={{display:"inline-flex",alignItems:"center",gap:4,
          background:`${T.blue}22`,border:`1px solid ${T.blue}55`,color:T.blue,
          borderRadius:20,padding:"3px 8px",fontSize:12.5,fontWeight:700}}>
          #{t}
          <span onClick={()=>removeTag(t)} style={{cursor:"pointer",display:"inline-flex",opacity:0.75}}>
            {Li("x",11,T.blue)}
          </span>
        </span>
      ))}
      <input value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={onKeyDown}
        onBlur={()=>draft && addTag(draft)}
        placeholder={tags.length?"":placeholder}
        style={{flex:1,minWidth:80,background:"transparent",border:"none",outline:"none",
          color:T.txt,fontSize:14,fontFamily:"inherit"}}/>
    </div>
  );
}

export { TagInput, normalizeTag };
