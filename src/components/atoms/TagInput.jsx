// Wiederverwendbares Tag-Eingabefeld — Chips + Freitext-Eingabe mit "#"-Optik.
// Speicherformat: value ist ein Array von Kleinbuchstaben-Strings OHNE führendes
// "#" (z.B. ["aida","amazon"]); die Anzeige ergänzt das "#" nur visuell. So
// bleibt die Suche (utils/search.js) unabhängig davon, ob der Nutzer beim
// Eintippen ein "#" mitschreibt oder nicht.
//
// Autovervollständigung: "suggestions" (alle bereits App-weit vergebenen Tags,
// s. utils/search.js getAllTags) wird während der Eingabe nach dem Draft
// gefiltert — per Tippen auf einen Vorschlag oder Pfeiltasten+Enter übernommen,
// damit ein einmal benutzter Tag (z.B. "aida") kein zweites Mal neu getippt
// werden muss (Tippfehler-Gefahr, uneinheitliche Schreibweise).
import React, { useState } from "react";
import { theme as T } from "../../theme/activeTheme.js";
import { Li } from "../../utils/icons.jsx";

function normalizeTag(raw) {
  return (raw||"").trim().replace(/^#+/,"").toLowerCase().slice(0,40);
}

function TagInput({ value, onChange, placeholder="Tag hinzufügen…", suggestions, style, inputStyle }) {
  const tags = value||[];
  const [draft, setDraft] = useState("");
  const [focused, setFocused] = useState(false);
  const [highlight, setHighlight] = useState(-1);

  const filteredSuggestions = (() => {
    const q = normalizeTag(draft);
    return (suggestions||[])
      .filter(t => !tags.includes(t))
      .filter(t => !q || t.includes(q))
      .slice(0, 6);
  })();
  const showDropdown = focused && filteredSuggestions.length>0;

  const addTag = (raw) => {
    const t = normalizeTag(raw);
    if(!t || tags.includes(t)) { setDraft(""); setHighlight(-1); return; }
    onChange([...tags, t]);
    setDraft("");
    setHighlight(-1);
  };
  const removeTag = (t) => onChange(tags.filter(x=>x!==t));

  const onKeyDown = (e) => {
    if(showDropdown && (e.key==="ArrowDown"||e.key==="ArrowUp")) {
      e.preventDefault();
      const dir = e.key==="ArrowDown" ? 1 : -1;
      setHighlight(h => {
        const n = h + dir;
        if(n < -1) return filteredSuggestions.length-1;
        if(n >= filteredSuggestions.length) return -1;
        return n;
      });
      return;
    }
    if(e.key==="Enter" || e.key==="," || e.key===" ") {
      e.preventDefault();
      if(showDropdown && highlight>=0) addTag(filteredSuggestions[highlight]);
      else addTag(draft);
      return;
    }
    if(e.key==="Escape") { setFocused(false); return; }
    if(e.key==="Backspace" && !draft && tags.length) { removeTag(tags[tags.length-1]); }
  };

  return (
    <div style={{position:"relative"}}>
      <div style={{width:"100%",background:"rgba(255,255,255,0.05)",border:`1px solid ${T.bd}`,
        borderRadius:11,padding:"6px 8px",marginBottom:9,boxSizing:"border-box",
        display:"flex",flexWrap:"wrap",gap:6,alignItems:"center",...style}}>
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
        <input value={draft}
          onChange={e=>{ setDraft(e.target.value); setHighlight(-1); }}
          onKeyDown={onKeyDown}
          onFocus={()=>setFocused(true)}
          onBlur={()=>{ if(draft) addTag(draft); setTimeout(()=>setFocused(false), 120); }}
          placeholder={tags.length?"":placeholder}
          style={{flex:1,minWidth:80,background:"transparent",border:"none",outline:"none",
            color:T.txt,fontSize:14,fontFamily:"inherit",...inputStyle}}/>
      </div>
      {showDropdown && (
        <div style={{position:"absolute",top:"100%",left:0,right:0,marginTop:-5,zIndex:5,
          background:T.surf||"#222",border:`1px solid ${T.bd}`,borderRadius:11,
          boxShadow:"0 8px 20px rgba(0,0,0,0.4)",overflow:"hidden"}}>
          {filteredSuggestions.map((t,i)=>(
            <div key={t}
              onMouseDown={e=>e.preventDefault()}
              onClick={()=>addTag(t)}
              style={{padding:"7px 12px",cursor:"pointer",fontSize:13,fontWeight:600,
                color:i===highlight?T.blue:T.txt,
                background:i===highlight?`${T.blue}1a`:"transparent"}}>
              #{t}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export { TagInput, normalizeTag };
