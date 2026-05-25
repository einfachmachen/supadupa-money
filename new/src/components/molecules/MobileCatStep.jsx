// Auto-generated module (siehe app-src.jsx)

import React, { useContext, useState } from "react";
import { Overlay } from "../atoms/Overlay.jsx";
import { MobileNewAccOverlay } from "./MobileNewAccOverlay.jsx";
import { AppCtx } from "../../state/AppContext.js";
import { theme as T } from "../../theme/activeTheme.js";
import { uid } from "../../utils/format.js";
import { Li } from "../../utils/icons.jsx";

function MobileCatStep({csvType, catId, subId, onSelect, S, btnBase, btnCenter}) {
  const { cats, setCats, groups, setGroups } = useContext(AppCtx);
  const [catStep,  setCatStep]  = React.useState("cat");
  const [selCat,   setSelCat]   = React.useState(null);
  const [newMode,  setNewMode]  = React.useState(null);
  const [newName,  setNewName]  = React.useState("");
  const [newType,  setNewType]  = React.useState(csvType==="income"?"income":"expense");

  const shownCats = cats.filter(c=>csvType==="income"?c.type==="income":c.type!=="income");

  const saveNewCatLocal = () => {
    if(!newName.trim()) return;
    const id="cat-"+uid();
    const nc={id,name:newName.trim(),icon:"tag",color:T.blue,type:newType,subs:[]};
    setCats(p=>[...p,nc]);
    setSelCat(nc); setCatStep("sub");
    setNewMode(null); setNewName("");
  };
  const saveNewSubLocal = () => {
    if(!newName.trim()||!selCat) return;
    const id="sub-"+uid();
    setCats(p=>p.map(c=>c.id===selCat.id?{...c,subs:[...(c.subs||[]),{id,name:newName.trim(),icon:""}]}:c));
    onSelect(selCat.id, id);
    setNewMode(null); setNewName("");
  };

  const inp = {width:"100%",boxSizing:"border-box",padding:`${S.padL}px`,
    borderRadius:S.radius,background:"rgba(255,255,255,0.06)",color:T.txt,
    fontSize:S.fs,fontFamily:"inherit",outline:"none",
    border:`2px solid ${T.blue}`,marginBottom:S.gap};

  if(newMode) return (
    <div>
      <button onClick={()=>{setNewMode(null);setNewName("");}}
        style={{...btnBase,justifyContent:"flex-start",padding:`${S.pad}px 0`,
          background:"none",border:"none",color:T.blue,fontWeight:400,
          marginBottom:S.gap,width:"auto"}}>
        ← zurück
      </button>
      <div style={{color:T.txt,fontSize:S.fs+2,fontWeight:700,marginBottom:S.gap}}>
        {newMode==="cat"?"neue Kategorie":"neue Unterkategorie"}
      </div>
      <div style={{color:T.txt2,fontSize:S.fs-4,marginBottom:6}}>Name</div>
      <input value={newName} onChange={e=>setNewName(e.target.value)}
        placeholder="Name…" autoFocus style={inp}/>
      {newMode==="cat"&&<>
        <div style={{color:T.txt2,fontSize:S.fs-4,marginBottom:6}}>Typ</div>
        <div style={{display:"flex",gap:S.gap/2,marginBottom:S.gap}}>
          {[["expense","Ausgabe",T.neg],["income","Einnahme",T.pos]].map(([t,l,c])=>(
            <button key={t} onClick={()=>setNewType(t)}
              style={{flex:1,padding:`${S.pad}px`,borderRadius:S.radius,
                background:newType===t?c+"22":"rgba(255,255,255,0.06)",
                border:`2px solid ${newType===t?c:T.bd}`,
                color:newType===t?c:T.txt2,fontSize:S.fs,fontWeight:700,
                cursor:"pointer",fontFamily:"inherit"}}>
              {l}
            </button>
          ))}
        </div>
      </>}
      <button onClick={newMode==="cat"?saveNewCatLocal:saveNewSubLocal}
        disabled={!newName.trim()}
        style={{...btnCenter,background:newName.trim()?T.blue:"rgba(255,255,255,0.1)",
          color:newName.trim()?"#fff":T.txt2}}>
        ✓ Anlegen
      </button>
    </div>
  );

  if(catStep==="sub"&&selCat) return (
    <div>
      <button onClick={()=>setCatStep("cat")}
        style={{...btnBase,justifyContent:"flex-start",padding:`${S.pad}px 0`,
          background:"none",border:"none",color:T.blue,fontWeight:400,
          marginBottom:S.gap,width:"auto"}}>
        ← {selCat.name}
      </button>
      <div style={{color:T.txt2,fontSize:S.fs-4,marginBottom:S.gap}}>Unterkategorie:</div>
      {(selCat.subs||cats.find(c=>c.id===selCat.id)?.subs||[]).map(sub=>(
        <button key={sub.id} onClick={()=>onSelect(selCat.id,sub.id)}
          style={{...btnBase,marginBottom:S.gap/2,
            background:"rgba(255,255,255,0.04)",
            border:`1.5px solid ${T.bd}`,color:T.txt,fontWeight:500}}>
          <span style={{display:"flex",alignItems:"center",gap:12,fontSize:S.fs}}>
            {sub.icon&&Li(sub.icon,S.fs+2,selCat.color||T.blue)}
            <span>{sub.name}</span>
          </span>
          <span style={{color:T.txt2,fontSize:S.fs,marginLeft:"auto"}}>›</span>
        </button>
      ))}
      <button onClick={()=>setNewMode("sub")}
        style={{...btnBase,marginTop:S.gap/2,
          background:"rgba(74,159,212,0.06)",
          border:`1.5px dashed ${T.blue}66`,color:T.blue,fontWeight:400}}>
        {Li("plus",S.fs-4,T.blue)} neue Unterkategorie
      </button>
    </div>
  );

  return (
    <div>
      <div style={{color:T.txt2,fontSize:S.fs-4,marginBottom:S.gap}}>Kategorie wählen:</div>
      {shownCats.map(cat=>(
        <button key={cat.id} onClick={()=>{setSelCat(cat);setCatStep("sub");}}
          style={{...btnBase,marginBottom:S.gap/2,
            background:"rgba(255,255,255,0.04)",
            border:`1.5px solid ${T.bd}`,color:T.txt,fontWeight:500}}>
          <span style={{display:"flex",alignItems:"center",gap:12,fontSize:S.fs}}>
            {cat.icon&&Li(cat.icon,S.fs+2,cat.color||T.blue)}
            <span>{cat.name}</span>
          </span>
          <span style={{color:T.txt2,fontSize:S.fs,marginLeft:"auto"}}>›</span>
        </button>
      ))}
      <button onClick={()=>setNewMode("cat")}
        style={{...btnBase,marginTop:S.gap/2,
          background:"rgba(74,159,212,0.06)",
          border:`1.5px dashed ${T.blue}66`,color:T.blue,fontWeight:400}}>
        {Li("plus",S.fs-4,T.blue)} neue Kategorie anlegen
      </button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// MobileNewAccOverlay — neues Konto anlegen (als Overlay für Mobile-Modals)

export { MobileCatStep };
