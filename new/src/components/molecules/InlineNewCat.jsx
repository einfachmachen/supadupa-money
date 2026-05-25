// Auto-generated module (siehe app-src.jsx)

import React, { useState } from "react";
import { theme as T } from "../../theme/activeTheme.js";
import { uid } from "../../utils/format.js";
import { Li } from "../../utils/icons.jsx";

function InlineNewCat({s, isIncome, groups, cats, setCats, set_, setNewCatPanel}) {
  const [ncType, setNcType] = React.useState(isIncome?"income":"expense");
  const [ncGroup, setNcGroup] = React.useState("");
  const [ncCatMode, setNcCatMode] = React.useState("existing");
  const [ncCatId, setNcCatId] = React.useState("");
  const [ncCatName, setNcCatName] = React.useState("");
  const [ncSubName, setNcSubName] = React.useState(s.shortDesc||"");
  const availGroups = groups.filter(g=>{
    const beh=g.behavior||g.type;
    return ncType==="income"?(beh==="income"):!(beh==="income"||beh==="tagesgeld");
  });
  const availCats = cats.filter(c=>c.type===(availGroups.find(g=>g.id===ncGroup)?.type||""));
  return (
    <div style={{background:"rgba(170,204,0,0.06)",border:`1px solid ${T.pos}33`,borderRadius:10,padding:"10px 12px",marginTop:6}}>
      <div style={{color:T.pos,fontSize:11,fontWeight:700,marginBottom:8,display:"flex",alignItems:"center",gap:6}}>
        {Li("plus",11,T.pos)} Neue Kategorie anlegen
      </div>
      <div style={{display:"flex",gap:6,marginBottom:8}}>
        {["income","expense"].map(t=>(
          <button key={t} onClick={()=>{setNcType(t);setNcGroup("");setNcCatId("");}}
            style={{flex:1,padding:"5px",borderRadius:7,border:`1px solid ${ncType===t?T.pos:T.bds}`,
              background:ncType===t?`${T.pos}22`:"transparent",
              color:ncType===t?T.pos:T.txt2,fontSize:10,fontWeight:ncType===t?700:400,cursor:"pointer",fontFamily:"inherit"}}>
            {t==="income"?"Einnahme":"Ausgabe"}
          </button>
        ))}
      </div>
      <div style={{color:T.txt2,fontSize:10,marginBottom:3}}>Gruppe</div>
      <select value={ncGroup} onChange={e=>{setNcGroup(e.target.value);setNcCatId("");}}
        style={{width:"100%",background:"rgba(255,255,255,0.06)",border:`1px solid ${T.bds}`,
          borderRadius:7,padding:"5px 8px",color:T.txt,fontSize:11,outline:"none",cursor:"pointer",marginBottom:8}}>
        <option value="" style={{background:T.surf2}}>— Gruppe wählen —</option>
        {availGroups.map(g=><option key={g.id} value={g.id} style={{background:T.surf2}}>{g.label}</option>)}
      </select>
      {ncGroup&&(
        <>
          <div style={{color:T.txt2,fontSize:10,marginBottom:3}}>Kategorie</div>
          <div style={{display:"flex",gap:6,marginBottom:6}}>
            <button onClick={()=>setNcCatMode("existing")}
              style={{flex:1,padding:"4px",borderRadius:6,border:`1px solid ${ncCatMode==="existing"?T.pos:T.bds}`,background:ncCatMode==="existing"?`${T.pos}22`:"transparent",color:ncCatMode==="existing"?T.pos:T.txt2,fontSize:10,cursor:"pointer",fontFamily:"inherit"}}>Bestehende</button>
            <button onClick={()=>setNcCatMode("new")}
              style={{flex:1,padding:"4px",borderRadius:6,border:`1px solid ${ncCatMode==="new"?T.pos:T.bds}`,background:ncCatMode==="new"?`${T.pos}22`:"transparent",color:ncCatMode==="new"?T.pos:T.txt2,fontSize:10,cursor:"pointer",fontFamily:"inherit"}}>+ Neue</button>
          </div>
          {ncCatMode==="existing"?(
            <select value={ncCatId} onChange={e=>setNcCatId(e.target.value)}
              style={{width:"100%",background:"rgba(255,255,255,0.06)",border:`1px solid ${T.bds}`,borderRadius:7,padding:"5px 8px",color:T.txt,fontSize:11,outline:"none",cursor:"pointer",marginBottom:6}}>
              <option value="" style={{background:T.surf2}}>— Kategorie wählen —</option>
              {availCats.map(c=><option key={c.id} value={c.id} style={{background:T.surf2}}>{c.name}</option>)}
            </select>
          ):(
            <input value={ncCatName} onChange={e=>setNcCatName(e.target.value)}
              placeholder="name der neuen Kategorie"
              style={{width:"100%",background:"rgba(255,255,255,0.06)",border:`1px solid ${T.bds}`,borderRadius:7,padding:"5px 8px",color:T.txt,fontSize:11,outline:"none",boxSizing:"border-box",marginBottom:6,fontFamily:"inherit"}}/>
          )}
          <div style={{color:T.txt2,fontSize:10,marginBottom:3}}>Unterkategorie</div>
          <input value={ncSubName} onChange={e=>setNcSubName(e.target.value)}
            placeholder="name der Unterkategorie"
            style={{width:"100%",background:"rgba(255,255,255,0.06)",border:`1px solid ${T.bds}`,borderRadius:7,padding:"5px 8px",color:T.txt,fontSize:11,outline:"none",boxSizing:"border-box",marginBottom:8,fontFamily:"inherit"}}/>
          <button
            disabled={!ncSubName.trim()||(ncCatMode==="existing"?!ncCatId:!ncCatName.trim())}
            onClick={()=>{
              const subId="sub-"+uid();
              let catId=ncCatId;
              if(ncCatMode==="new"&&ncCatName.trim()) {
                const grp=availGroups.find(g=>g.id===ncGroup);
                catId="cat-"+uid();
                setCats(p=>[...p,{id:catId,name:ncCatName.trim(),type:grp?.type||"expense",icon:"tag",color:"#FFA07A",subs:[{id:subId,name:ncSubName.trim()}]}]);
              } else {
                setCats(p=>p.map(c=>c.id===catId?{...c,subs:[...c.subs,{id:subId,name:ncSubName.trim()}]}:c));
              }
              set_(s.id,"catId",catId);
              set_(s.id,"subId",subId);
              setNewCatPanel(null);
            }}
            style={{width:"100%",padding:"7px",borderRadius:8,border:"none",
              background:T.pos,color:T.on_accent,fontSize:12,fontWeight:700,
              cursor:"pointer",fontFamily:"inherit",opacity:(!ncSubName.trim()||(ncCatMode==="existing"?!ncCatId:!ncCatName.trim()))?0.4:1}}>
            {Li("check",12,T.on_accent)} Anlegen & auswählen
          </button>
        </>
      )}
    </div>
  );
}

export { InlineNewCat };
