// Auto-generated module (siehe app-src.jsx)

import React, { useContext, useState } from "react";
import { SupaField } from "../atoms/SupaField.jsx";
import { IconPickerDialog } from "./IconPickerDialog.jsx";
import { AppCtx } from "../../state/AppContext.js";
import { theme as T } from "../../theme/activeTheme.js";
import { INP } from "../../theme/palette.js";
import { uid } from "../../utils/format.js";
import { Li } from "../../utils/icons.jsx";

function AddAccountForm({setAccounts}) {
  const [na, setNa] = useState({name:"", icon:"credit-card", color:T.blue, delayDays:0});
  const [showIconPick, setShowIconPick] = useState(false);
  const { globalDrag } = useContext(AppCtx);
  const save = () => {
    if(!na.name.trim()) return;
    setAccounts(p=>[...p,{id:"acc-"+uid(),name:na.name.trim(),icon:na.icon,color:na.color||T.blue,delayDays:na.delayDays}]);
    setNa({name:"",icon:"credit-card",color:T.blue,delayDays:0});
  };
  return (
    <div style={{marginBottom:4}}>
      {showIconPick&&(
        <IconPickerDialog
          selectedIcon={na.icon}
          selectedColor={T.blue}
          onSelect={ic=>{setNa(p=>({...p,icon:ic}));setShowIconPick(false);}}
          onClose={()=>setShowIconPick(false)}
        />
      )}
      <div style={{display:"flex",gap:6,alignItems:"center"}}>
        <button
          data-dropzone="acc-icon"
          onClick={()=>setShowIconPick(true)}
          onPointerUp={()=>{ if(globalDrag.current?.icon){setNa(p=>({...p,icon:globalDrag.current.icon,...(globalDrag.current.color?{color:globalDrag.current.color}:{})}));globalDrag.current=null;} }}
          style={{width:36,height:36,borderRadius:9,border:`1px dashed ${T.bds}`,
            background:"rgba(255,255,255,0.06)",cursor:"pointer",
            display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
          {Li(na.icon,18,na.color||T.blue)}
        </button>
        <input placeholder="Name (z.B. Girokonto)" value={na.name}
          onChange={e=>setNa(p=>({...p,name:e.target.value}))}
          onKeyDown={e=>e.key==="Enter"&&save()}
          style={{...INP,marginBottom:0,flex:1,fontSize:12,padding:"7px 10px"}}/>
        <input placeholder="+Tage" value={na.delayDays||""} inputMode="numeric"
          onChange={e=>setNa(p=>({...p,delayDays:parseInt(e.target.value)||0}))}
          style={{...INP,marginBottom:0,width:52,fontSize:12,padding:"7px 6px",textAlign:"center"}}/>
        <button onClick={save} disabled={!na.name.trim()}
          style={{width:36,height:36,borderRadius:9,border:`1px solid ${T.bd}`,flexShrink:0,
            background:"rgba(255,255,255,0.04)",
            cursor:na.name.trim()?"pointer":"default",
            display:"flex",alignItems:"center",justifyContent:"center",
            opacity:na.name.trim()?1:0.3}}>
          {Li("check",18,na.name.trim()?"#AACC00":T.txt2)}
        </button>
      </div>
    </div>
  );
}



// ══════════════════════════════════════════════════════════════════════
// ── SupaField: gesperrtes Eingabefeld mit Long-Press zum Entsperren ──────────

export { AddAccountForm };
