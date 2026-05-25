// Auto-generated module (siehe app-src.jsx)

import React, { useState } from "react";
import { SafeIcon } from "../atoms/SafeIcon.jsx";
import { PagedIconGrid } from "./PagedIconGrid.jsx";
import { theme as T } from "../../theme/activeTheme.js";
import { ALL_LUCIDE_ICONS, Li } from "../../utils/icons.jsx";

function QuickNewDialog({onClose, onSave}) {
  const [draft, setDraft] = React.useState({label:"",icon:"star",color:T.blue});
  const [search, setSearch] = React.useState("");
  const COLORS = [T.blue,"#4A9FD4","#F5A623","#FF5F5F","#B066CC","#2ECC71","#E67E22","#E91E8C","#00BCD4","#ffffff"];
  // icons paginiert via PagedIconGrid

  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",zIndex:90,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:T.surf2,borderRadius:20,padding:"16px 14px 28px",width:"100%",maxWidth:480,maxHeight:"85vh",display:"flex",flexDirection:"column",gap:10,overflowY:"auto"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <span style={{color:T.blue,fontSize:15,fontWeight:700}}>Schnellwahl anlegen</span>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:T.txt2}}>{Li("x",16)}</button>
        </div>

        {/* Preview */}
        <div style={{display:"flex",justifyContent:"center"}}>
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:5,padding:"12px 24px",borderRadius:14,background:T.surf}}>
            {Li(draft.icon||"star",28,draft.color||T.blue,1.5)}
            <span style={{fontSize:11,color:draft.color||T.blue,fontWeight:700}}>{draft.label||"Bezeichnung"}</span>
          </div>
        </div>

        {/* Bezeichnung */}
        <div>
          <div style={{color:T.txt2,fontSize:11,marginBottom:3}}>Bezeichnung</div>
          <input value={draft.label} onChange={e=>setDraft(p=>({...p,label:e.target.value}))} placeholder="z.B. Einkauf, Tanken…" autoFocus
            style={{width:"100%",background:T.surf,border:`1px solid ${T.bds}`,borderRadius:9,padding:"8px 11px",color:T.txt,fontSize:13,outline:"none"}}/>
        </div>

        {/* Farbe */}
        <div>
          <div style={{color:T.txt2,fontSize:11,marginBottom:5}}>Farbe</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {COLORS.map(c=>(
              <button key={c} onClick={()=>setDraft(p=>({...p,color:c}))}
                style={{width:30,height:30,borderRadius:"50%",background:c,border:draft.color===c?"3px solid rgba(255,255,255,0.9)":"2px solid transparent",cursor:"pointer"}}/>
            ))}
          </div>
        </div>

        {/* Icon Suche */}
        <div style={{flex:1,minHeight:0}}>
          <div style={{color:T.txt2,fontSize:11,marginBottom:4}}>Icon ({ALL_LUCIDE_ICONS.length} verfügbar)</div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Icon suchen…"
            style={{width:"100%",background:T.surf,border:`1px solid ${T.bds}`,borderRadius:9,padding:"6px 10px",color:T.txt,fontSize:13,outline:"none",marginBottom:8}}/>
          <div style={{maxHeight:180,overflowY:"auto"}}>
            <PagedIconGrid search={search} selectedIcon={draft.icon} selectedColor={draft.color||T.blue}
              onSelect={ic=>setDraft(p=>({...p,icon:ic}))}/>
          </div>
        </div>

        <button onClick={()=>draft.label.trim()&&onSave(draft)}
          style={{padding:"10px",borderRadius:11,background:draft.label.trim()?`${T.blue}`:"rgba(255,255,255,0.1)",
            border:"none",color:draft.label.trim()?"#000":T.txt2,fontWeight:700,cursor:"pointer",fontSize:14,marginTop:4}}>
          Speichern
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// ── Shared helper: paginiertes Icon-Grid (verhindert DOM-Overload) ─────────────

// SafeIcon - renders a lucide icon safely, never crashes

export { QuickNewDialog };
