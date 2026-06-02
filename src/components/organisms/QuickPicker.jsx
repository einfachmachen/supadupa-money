// Auto-generated module (siehe app-src.jsx)

import React, { useContext, useState } from "react";
import { QuickBtnsBar } from "../molecules/QuickBtnsBar.jsx";
import { ThemeDropdown } from "../molecules/ThemeDropdown.jsx";
import { IconPickerDialog } from "./IconPickerDialog.jsx";
import { PagedIconGrid } from "./PagedIconGrid.jsx";
import { AppCtx } from "../../state/AppContext.js";
import { theme as T } from "../../theme/activeTheme.js";
import { Li } from "../../utils/icons.jsx";

function QuickPicker({onClose}) {
  const {quickBtns, setQuickBtns, cats} = useContext(AppCtx);
  const [search, setSearch] = React.useState("");
  const [editBtn, setEditBtn] = React.useState(null);
  const [draft, setDraft] = React.useState({icon:"star",label:"",catId:"",color:T.blue});
  const [showQBIconPicker, setShowQBIconPicker] = React.useState(false);
  const COLORS = [T.blue,"#4A9FD4","#F5A623","#FF5F5F","#B066CC","#2ECC71","#E67E22","#E91E8C","#00BCD4","#ccc"];

  // filteredIcons paginiert via PagedIconGrid

  const openNew = () => { setDraft({icon:"star",label:"",catId:"",color:T.blue}); setEditBtn("new"); };
  const openEdit = (btn) => { setDraft({...btn}); setEditBtn(btn); };
  const saveBtn = () => {
    if(editBtn==="new") setQuickBtns(p=>[...p,{...draft,id:"q"+Date.now()}]);
    else setQuickBtns(p=>p.map(b=>b.id===editBtn.id?{...draft,id:editBtn.id}:b));
    setEditBtn(null);
  };
  const delBtn = () => { setQuickBtns(p=>p.filter(b=>b.id!==editBtn.id)); setEditBtn(null); };

  if(editBtn!==null) return (
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:90,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:T.surf2,borderRadius:20,padding:"16px 14px 28px",width:"100%",maxWidth:480,maxHeight:"88vh",display:"flex",flexDirection:"column",gap:10,overflowY:"auto"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <span style={{color:T.blue,fontSize:15,fontWeight:700}}>{editBtn==="new"?"schnellwahl anlegen":"schnellwahl bearbeiten"}</span>
          <button onClick={()=>setEditBtn(null)} style={{background:"none",border:"none",cursor:"pointer",color:T.txt2}}>{Li("x",16)}</button>
        </div>

        {/* Preview — klick öffnet Icon-Picker */}
        <div style={{display:"flex",justifyContent:"center"}}>
          <button onClick={()=>setShowQBIconPicker(true)}
            style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,padding:"10px 20px",borderRadius:12,background:T.surf,border:`1px solid ${T.bds}`,cursor:"pointer"}}>
            {Li(draft.icon||"star",26,draft.color||T.blue,1.5)}
            <span style={{fontSize:10,color:draft.color||T.blue,fontWeight:700}}>{draft.label||"Label"}</span>
            <span style={{fontSize:9,color:T.txt2}}>{Li("edit",8,T.txt2)} Icon tippen</span>
          </button>
        </div>
        {showQBIconPicker&&(
          <IconPickerDialog selectedIcon={draft.icon||"star"} selectedColor={draft.color||T.blue}
            onSelect={ic=>{setDraft(p=>({...p,icon:ic}));setShowQBIconPicker(false);}}
            onClose={()=>setShowQBIconPicker(false)}/>
        )}

        {/* Label */}
        <div>
          <div style={{color:T.txt2,fontSize:11,marginBottom:3}}>Bezeichnung</div>
          <input value={draft.label} onChange={e=>setDraft(p=>({...p,label:e.target.value}))} placeholder="z.B. Einkauf, Tanken…"
            style={{width:"100%",background:T.surf,border:`1px solid ${T.bds}`,borderRadius:8,padding:"7px 10px",color:T.txt,fontSize:13,outline:"none"}}/>
        </div>

        {/* Kategorie */}
        <div>
          <div style={{color:T.txt2,fontSize:11,marginBottom:3}}>Kategorie (optional)</div>
          <select value={draft.catId} onChange={e=>setDraft(p=>({...p,catId:e.target.value}))}
            style={{width:"100%",background:T.surf,border:`1px solid ${T.bds}`,borderRadius:8,padding:"7px 10px",color:T.txt,fontSize:13,outline:"none"}}>
            <option value="">— keine —</option>
            {cats.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {/* Farbe */}
        <div>
          <div style={{color:T.txt2,fontSize:11,marginBottom:5}}>Farbe</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {COLORS.map(c=>(
              <button key={c} onClick={()=>setDraft(p=>({...p,color:c}))}
                style={{width:28,height:28,borderRadius:"50%",background:c,border:draft.color===c?"3px solid #fff":"2px solid transparent",cursor:"pointer"}}/>
            ))}
          </div>
        </div>

        {/* Icon Suche */}
        <div>
          <div style={{color:T.txt2,fontSize:11,marginBottom:3}}>Icon</div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Icon suchen…"
            style={{width:"100%",background:T.surf,border:`1px solid ${T.bds}`,borderRadius:8,padding:"6px 10px",color:T.txt,fontSize:13,outline:"none",marginBottom:8}}/>
          <div style={{maxHeight:150,overflowY:"auto"}}>
            <PagedIconGrid search={search} selectedIcon={draft.icon} selectedColor={draft.color||T.blue}
              onSelect={ic=>setDraft(p=>({...p,icon:ic}))}/>
          </div>
        </div>

        <div style={{display:"flex",gap:8,marginTop:4}}>
          {editBtn!=="new"&&<button onClick={delBtn}
            style={{padding:"9px 14px",borderRadius:9,background:"rgba(255,95,95,0.12)",border:"1px solid rgba(255,95,95,0.25)",color:"#FF5F5F",cursor:"pointer",fontSize:12,display:"flex",alignItems:"center",gap:5}}>
            {Li("trash-2",12)}
          </button>}
          <button onClick={saveBtn} style={{flex:1,padding:"9px",borderRadius:9,background:T.blue,border:"none",color:"#000",fontWeight:700,cursor:"pointer",fontSize:13}}>
            Speichern
          </button>
        </div>
      </div>
    </div>
  );

  // Main view: show existing quickBtns + add button
  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:90,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:T.surf2,borderRadius:20,padding:"16px 14px 28px",width:"100%",maxWidth:480}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
          <span style={{color:T.blue,fontSize:15,fontWeight:700}}>Schnellwahlen</span>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:T.txt2}}>{Li("x",16)}</button>
        </div>
        <QuickBtnsBar onSelect={btn => openEdit(btn)} />
        <div style={{color:T.txt2,fontSize:11,textAlign:"center"}}>Antippen zum Bearbeiten · Lang drücken zum Löschen</div>
      </div>
    </div>
  );
}


// ── ThemeDropdown — eigene Komponente (Hooks dürfen nicht in IIFE stehen) ──

export { QuickPicker };
