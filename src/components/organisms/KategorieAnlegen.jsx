// Auto-generated module (siehe app-src.jsx)

import React, { useContext, useState } from "react";
import { CatPicker } from "../molecules/CatPicker.jsx";
import { AppCtx } from "../../state/AppContext.js";
import { theme as T } from "../../theme/activeTheme.js";
import { INP } from "../../theme/palette.js";
import { uid } from "../../utils/format.js";
import { Li } from "../../utils/icons.jsx";

function KategorieAnlegen({onDone}) {
  const { cats, setCats, groups } = useContext(AppCtx);
  const [selVal, setSelVal] = React.useState("|");
  const [catType, setCatType] = React.useState("expense");
  const isLight = T.themeName==="light"||T.themeName==="ios"||T.themeName==="material"||T.themeName==="paper";
  const [subName, setSubName] = React.useState("");
  const [saved, setSaved] = React.useState("");

  // Rename cat
  const [renameMode, setRenameMode] = React.useState(null); // {type:"cat"|"sub", catId, subId?, name}
  const [renameName, setRenameName] = React.useState("");

  const filteredCats = cats.filter(c=>catType==="income"?(c.type==="income"||c.type==="tagesgeld"):c.type==="expense");

  return (
    <div style={{marginTop:4}}>
      {/* Ausgaben / Einnahmen Toggle */}
      <div style={{display:"flex",gap:4,marginBottom:10}}>
        {[["expense","Ausgaben",T.neg],["income","Einnahmen",T.pos]].map(([v,l,col])=>(
          <button key={v} onClick={()=>setCatType(v)}
            style={{flex:1,padding:"7px",borderRadius:10,cursor:"pointer",fontSize:13,fontWeight:700,
              border:`2px solid ${catType===v?col:T.bd}`,
              background:catType===v?col:isLight?"rgba(0,0,0,0.04)":"rgba(255,255,255,0.04)",
              color:catType===v?"#fff":T.txt2,fontFamily:"inherit"}}>
            {l}
          </button>
        ))}
      </div>

      {/* Bestehende Kategorien mit Umbenennen */}
      <div style={{maxHeight:280,overflowY:"auto",marginBottom:10}}>
        {filteredCats.length===0&&(
          <div style={{color:T.txt2,fontSize:12,textAlign:"center",padding:"16px 0"}}>
            Noch keine Kategorien vorhanden.
          </div>
        )}
        {filteredCats.map(cat=>(
          <div key={cat.id} style={{marginBottom:6,borderRadius:10,
            border:`1px solid ${T.bd}`,overflow:"hidden",
            background:"rgba(255,255,255,0.03)"}}>
            {/* Kategorie-Header */}
            <div style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",
              borderBottom:`1px solid ${T.bd}`,background:"rgba(255,255,255,0.03)"}}>
              <div style={{width:9,height:9,borderRadius:"50%",background:cat.color,flexShrink:0}}/>
              {renameMode?.type==="cat"&&renameMode?.catId===cat.id?(
                <input value={renameName} onChange={e=>setRenameName(e.target.value)}
                  autoFocus onKeyDown={e=>{
                    if(e.key==="Enter"){
                      if(renameName.trim()) setCats(p=>p.map(c=>c.id===cat.id?{...c,name:renameName.trim()}:c));
                      setRenameMode(null);
                    }
                    if(e.key==="Escape") setRenameMode(null);
                  }}
                  style={{...INP,marginBottom:0,flex:1,fontSize:12,padding:"3px 7px"}}/>
              ):(
                <span style={{flex:1,color:cat.color||T.txt,fontSize:12,fontWeight:700}}>{cat.name}</span>
              )}
              <button onClick={()=>{setRenameMode({type:"cat",catId:cat.id});setRenameName(cat.name);}}
                style={{background:"none",border:"none",color:T.txt2,cursor:"pointer",padding:2}}>
                {Li("edit-2",11,T.txt2)}
              </button>
            </div>
            {/* Unterkategorien */}
            {(cat.subs||[]).map(sub=>(
              <div key={sub.id} style={{display:"flex",alignItems:"center",gap:8,
                padding:"5px 10px 5px 22px",borderBottom:`1px solid ${T.bd}`}}>
                {renameMode?.type==="sub"&&renameMode?.subId===sub.id?(
                  <input value={renameName} onChange={e=>setRenameName(e.target.value)}
                    autoFocus onKeyDown={e=>{
                      if(e.key==="Enter"){
                        if(renameName.trim()) setCats(p=>p.map(c=>c.id===cat.id?{...c,subs:c.subs.map(s=>s.id===sub.id?{...s,name:renameName.trim()}:s)}:c));
                        setRenameMode(null);
                      }
                      if(e.key==="Escape") setRenameMode(null);
                    }}
                    style={{...INP,marginBottom:0,flex:1,fontSize:11,padding:"3px 7px"}}/>
                ):(
                  <span style={{flex:1,color:T.txt2,fontSize:11}}>· {sub.name}</span>
                )}
                <button onClick={()=>{setRenameMode({type:"sub",catId:cat.id,subId:sub.id});setRenameName(sub.name);}}
                  style={{background:"none",border:"none",color:T.txt2,cursor:"pointer",padding:2}}>
                  {Li("edit-2",10,T.txt2)}
                </button>
              </div>
            ))}
            {/* Neue Unterkategorie */}
            <div style={{padding:"5px 10px 5px 22px",display:"flex",gap:6}}>
              <input value={selVal===cat.id?subName:""} onFocus={()=>setSelVal(cat.id)}
                onChange={e=>setSubName(e.target.value)}
                placeholder="+ Unterkategorie hinzufügen…"
                onKeyDown={e=>{
                  if(e.key==="Enter"&&subName.trim()){
                    setCats(p=>p.map(c=>c.id===cat.id?{...c,subs:[...c.subs,{id:"sub-"+uid(),name:subName.trim()}]}:c));
                    setSubName(""); setSaved(cat.id);
                    setTimeout(()=>setSaved(""),1200);
                  }
                }}
                style={{...INP,marginBottom:0,flex:1,fontSize:11,padding:"4px 8px",
                  border:`1px solid ${saved===cat.id?T.pos:T.bds}`}}/>
              {saved===cat.id&&<span style={{color:T.pos,fontSize:10,display:"flex",alignItems:"center"}}>{Li("check",11,T.pos)}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Neue Kategorie über CatPicker anlegen */}
      <div style={{borderTop:`1px solid ${T.bd}`,paddingTop:8}}>
        <div style={{color:T.txt2,fontSize:11,marginBottom:6}}>Oder neue Kategorie anlegen:</div>
        <CatPicker value="|" onChange={(catId,subId)=>{}} filterType={catType} placeholder="+ Neue Kategorie / Unterkategorie…"/>
      </div>
    </div>
  );
}

export { KategorieAnlegen };
