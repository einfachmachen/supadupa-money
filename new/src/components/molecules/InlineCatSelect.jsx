// Auto-generated module (siehe app-src.jsx)

import React, { useState } from "react";
import { InlineNewCat } from "./InlineNewCat.jsx";
import { RecurringDetectionScreen } from "../screens/RecurringDetectionScreen.jsx";
import { theme as T } from "../../theme/activeTheme.js";
import { uid } from "../../utils/format.js";
import { Li } from "../../utils/icons.jsx";

function InlineCatSelect({value, onChange, allCatOpts, cats, setCats, groups, isIncome, accentColor}) {
  const [showNew, setShowNew] = React.useState(false);
  const [ncType, setNcType] = React.useState(isIncome?"income":"expense");
  const [ncGroup, setNcGroup] = React.useState("");
  const [ncCatMode, setNcCatMode] = React.useState("existing");
  const [ncCatId, setNcCatId] = React.useState("");
  const [ncCatName, setNcCatName] = React.useState("");
  const [ncSubName, setNcSubName] = React.useState("");
  const col = accentColor || T.pos;
  const availGroups = (groups||[]).filter(g=>{
    const beh=g.behavior||g.type;
    return ncType==="income"?(beh==="income"):!(beh==="income"||beh==="tagesgeld");
  });
  const availCats = (cats||[]).filter(c=>c.type===(availGroups.find(g=>g.id===ncGroup)?.type||"__none__"));
  const canCreate = ncSubName.trim() && (ncCatMode==="existing"?ncCatId:ncCatName.trim()) && ncGroup;
  return (
    <div style={{flex:1}}>
      <div style={{display:"flex",gap:5,alignItems:"center"}}>
        <select value={value} onChange={e=>onChange(e.target.value)}
          style={{flex:1,background:"rgba(255,255,255,0.06)",border:`1px solid ${value&&value!=="|"?col+"66":T.bds}`,
            borderRadius:7,padding:"4px 7px",color:T.txt2,fontSize:10,outline:"none",cursor:"pointer"}}>
          <option value="|" style={{background:T.surf2}}>— Kategorie wählen —</option>
          {(allCatOpts||[]).map(o=>(
            <option key={o.catId+"|"+o.subId} value={o.catId+"|"+o.subId} style={{background:T.surf2}}>{o.label}</option>
          ))}
        </select>
        <button onClick={()=>setShowNew(v=>!v)}
          title="neue Kategorie anlegen"
          style={{padding:"3px 7px",borderRadius:6,border:`1px solid ${showNew?col:T.bds}`,
            background:showNew?`${col}22`:"transparent",color:showNew?col:T.txt2,
            fontSize:10,cursor:"pointer",flexShrink:0,fontFamily:"inherit",fontWeight:700}}>
          + Neu
        </button>
      </div>
      {showNew&&(
        <div style={{background:"rgba(170,204,0,0.05)",border:`1px solid ${T.pos}33`,
          borderRadius:9,padding:"9px 10px",marginTop:5}}>
          {/* Typ */}
          <div style={{display:"flex",gap:5,marginBottom:7}}>
            {["income","expense"].map(t=>(
              <button key={t} onClick={()=>{setNcType(t);setNcGroup("");setNcCatId("");}}
                style={{flex:1,padding:"4px",borderRadius:6,border:`1px solid ${ncType===t?T.pos:T.bds}`,
                  background:ncType===t?`${T.pos}22`:"transparent",
                  color:ncType===t?T.pos:T.txt2,fontSize:9,fontWeight:ncType===t?700:400,
                  cursor:"pointer",fontFamily:"inherit"}}>
                {t==="income"?"Einnahme":"Ausgabe"}
              </button>
            ))}
          </div>
          {/* Gruppe */}
          <select value={ncGroup} onChange={e=>{setNcGroup(e.target.value);setNcCatId("");}}
            style={{width:"100%",background:"rgba(255,255,255,0.06)",border:`1px solid ${T.bds}`,
              borderRadius:6,padding:"4px 7px",color:T.txt,fontSize:10,outline:"none",cursor:"pointer",marginBottom:6}}>
            <option value="" style={{background:T.surf2}}>— Gruppe wählen —</option>
            {availGroups.map(g=><option key={g.id} value={g.id} style={{background:T.surf2}}>{g.label}</option>)}
          </select>
          {ncGroup&&(<>
            {/* Kategorie */}
            <div style={{display:"flex",gap:5,marginBottom:5}}>
              <button onClick={()=>setNcCatMode("existing")}
                style={{flex:1,padding:"3px",borderRadius:5,border:`1px solid ${ncCatMode==="existing"?T.pos:T.bds}`,
                  background:ncCatMode==="existing"?`${T.pos}22`:"transparent",
                  color:ncCatMode==="existing"?T.pos:T.txt2,fontSize:9,cursor:"pointer",fontFamily:"inherit"}}>
                Bestehende
              </button>
              <button onClick={()=>setNcCatMode("new")}
                style={{flex:1,padding:"3px",borderRadius:5,border:`1px solid ${ncCatMode==="new"?T.pos:T.bds}`,
                  background:ncCatMode==="new"?`${T.pos}22`:"transparent",
                  color:ncCatMode==="new"?T.pos:T.txt2,fontSize:9,cursor:"pointer",fontFamily:"inherit"}}>
                + Neue
              </button>
            </div>
            {ncCatMode==="existing"?(
              <select value={ncCatId} onChange={e=>setNcCatId(e.target.value)}
                style={{width:"100%",background:"rgba(255,255,255,0.06)",border:`1px solid ${T.bds}`,
                  borderRadius:6,padding:"4px 7px",color:T.txt,fontSize:10,outline:"none",cursor:"pointer",marginBottom:5}}>
                <option value="" style={{background:T.surf2}}>— Kategorie —</option>
                {availCats.map(c=><option key={c.id} value={c.id} style={{background:T.surf2}}>{c.name}</option>)}
              </select>
            ):(
              <input value={ncCatName} onChange={e=>setNcCatName(e.target.value)}
                placeholder="name der Kategorie"
                style={{width:"100%",background:"rgba(255,255,255,0.06)",border:`1px solid ${T.bds}`,
                  borderRadius:6,padding:"4px 7px",color:T.txt,fontSize:10,outline:"none",
                  boxSizing:"border-box",marginBottom:5,fontFamily:"inherit"}}/>
            )}
            {/* Unterkategorie */}
            <input value={ncSubName} onChange={e=>setNcSubName(e.target.value)}
              placeholder="name der Unterkategorie"
              style={{width:"100%",background:"rgba(255,255,255,0.06)",border:`1px solid ${T.bds}`,
                borderRadius:6,padding:"4px 7px",color:T.txt,fontSize:10,outline:"none",
                boxSizing:"border-box",marginBottom:6,fontFamily:"inherit"}}/>
            <button disabled={!canCreate} onClick={()=>{
              const subId="sub-"+uid();
              let catId=ncCatId;
              if(ncCatMode==="new") {
                const grp=availGroups.find(g=>g.id===ncGroup);
                catId="cat-"+uid();
                setCats(p=>[...p,{id:catId,name:ncCatName.trim(),type:grp?.type||"expense",
                  icon:"tag",color:"#FFA07A",subs:[{id:subId,name:ncSubName.trim()}]}]);
              } else {
                setCats(p=>p.map(c=>c.id===catId
                  ?{...c,subs:[...c.subs,{id:subId,name:ncSubName.trim()}]}:c));
              }
              onChange(catId+"|"+subId);
              setShowNew(false);
              setNcCatName(""); setNcSubName(""); setNcGroup(""); setNcCatId("");
            }}
              style={{width:"100%",padding:"5px",borderRadius:7,border:"none",
                background:canCreate?T.pos:T.disabled,color:T.on_accent,fontSize:10,fontWeight:700,
                cursor:canCreate?"pointer":"default",fontFamily:"inherit",opacity:canCreate?1:0.4}}>
              {Li("check",10,T.on_accent)} Anlegen & auswählen
            </button>
          </>)}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// RecurringDetectionScreen — wiederkehrende Buchungen erkennen
// ══════════════════════════════════════════════════════════════════════

// ── InlineNewCat: inline Kategorie-Ersteller in RecurringDetectionScreen ──

export { InlineCatSelect };
