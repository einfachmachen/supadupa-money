// Auto-generated module (siehe app-src.jsx)

import React, { useContext, useState } from "react";
import { MobileActionPicker } from "../organisms/MobileActionPicker.jsx";
import { MonthPickerModal } from "../organisms/MonthPickerModal.jsx";
import { AppCtx } from "../../state/AppContext.js";
import { theme as T } from "../../theme/activeTheme.js";
import { uid } from "../../utils/format.js";
import { Li } from "../../utils/icons.jsx";

function MobileNewAccOverlay({onClose, S}) {
  const { accounts, setAccounts } = useContext(AppCtx);
  const [name,  setName]  = useState("");
  const [color, setColor] = useState(T.blue);
  const [icon,  setIcon]  = useState("landmark");
  const [delay, setDelay] = useState("");
  const COLORS = [T.blue,"#e74c3c","#2ecc71",T.gold,"#9b59b6","#1abc9c","#e67e22","#e91e63","#00bcd4","#607d8b"];
  const ICONS  = ["landmark","credit-card","wallet","piggy-bank","euro","building","briefcase","shopping-cart"];
  const inp = {width:"100%",boxSizing:"border-box",padding:`${S.padL}px`,
    borderRadius:S.radius,background:"rgba(255,255,255,0.06)",color:T.txt,
    fontSize:S.fs,fontFamily:"inherit",outline:"none",
    border:`2px solid ${T.blue}`,marginBottom:S.gap};
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",
      backdropFilter:"blur(8px)",zIndex:400,
      display:"flex",flexDirection:"column",justifyContent:"flex-end"}}>
      <div style={{background:T.surf2,borderRadius:"20px 20px 0 0",
        padding:S.padL,border:`1px solid ${T.bd}`,maxHeight:"80vh",overflowY:"auto"}}>
        <div style={{color:T.txt,fontSize:S.fs+2,fontWeight:700,marginBottom:S.gap}}>
          neues Konto / Zahlungsmittel
        </div>
        <input value={name} onChange={e=>setName(e.target.value)}
          placeholder="Name (z.B. Giro, Bar, PayPal)" autoFocus style={inp}/>
        <div style={{color:T.txt2,fontSize:S.fs-4,marginBottom:6,fontWeight:600}}>Farbe</div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:S.gap}}>
          {COLORS.map(c=>(
            <div key={c} onClick={()=>setColor(c)}
              style={{width:44,height:44,borderRadius:S.radius/2,background:c,cursor:"pointer",
                border:`3px solid ${color===c?"#fff":"transparent"}`,flexShrink:0}}/>
          ))}
        </div>
        <div style={{color:T.txt2,fontSize:S.fs-4,marginBottom:6,fontWeight:600}}>Icon</div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:S.gap}}>
          {ICONS.map(ic=>(
            <button key={ic} onClick={()=>setIcon(ic)}
              style={{width:52,height:52,borderRadius:S.radius/2,
                background:icon===ic?color+"33":"rgba(255,255,255,0.06)",
                border:`2px solid ${icon===ic?color:T.bd}`,
                cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
              {Li(ic,S.fs,icon===ic?color:T.txt2)}
            </button>
          ))}
        </div>
        <input value={delay} onChange={e=>setDelay(e.target.value.replace(/[^0-9]/g,""))}
          placeholder="Verzögerung in Tagen (optional, z.B. 30)"
          style={{...inp,border:`2px solid ${delay?T.gold:T.bd}`}}/>
        <div style={{display:"flex",gap:S.gap}}>
          <button onClick={()=>{
            if(!name.trim()) return;
            const newAcc = {id:"acc-"+uid(),name:name.trim(),
              icon,color,delayDays:delay?parseInt(delay):0};
            setAccounts(p=>[...p,newAcc]);
            onClose(newAcc.id);
          }} style={{flex:1,padding:`${S.padL}px`,borderRadius:S.radius,
            border:"none",background:name.trim()?T.pos:"rgba(255,255,255,0.1)",
            color:name.trim()?"#fff":T.txt2,fontSize:S.fs,fontWeight:700,
            cursor:"pointer",fontFamily:"inherit"}}>
            ✓ Anlegen
          </button>
          <button onClick={()=>onClose(null)}
            style={{padding:`${S.padL}px ${S.padL}px`,borderRadius:S.radius,
              border:`1.5px solid ${T.bd}`,background:"transparent",
              color:T.txt2,fontSize:S.fs,cursor:"pointer",fontFamily:"inherit"}}>
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

// MobileActionPicker — Auswahl der + Funktion im mobilen Modus
// ══════════════════════════════════════════════════════════════════════
// MonthPickerModal — Monats-/Jahres-Auswahl als Slide-up
// Mit optimistic UI: getippter Monat sofort highlighted, dann schließt sich
// das Modal und die App rendert mit dem neuen Stand.
// ══════════════════════════════════════════════════════════════════════

export { MobileNewAccOverlay };
