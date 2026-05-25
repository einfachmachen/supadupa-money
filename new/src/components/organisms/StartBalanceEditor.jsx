// Auto-generated module (siehe app-src.jsx)

import React, { useContext, useMemo, useState } from "react";
import { KontostandImportButton } from "../buttons/KontostandImportButton.jsx";
import { AppCtx } from "../../state/AppContext.js";
import { theme as T } from "../../theme/activeTheme.js";
import { Li } from "../../utils/icons.jsx";

function StartBalanceEditor() {
  const { accounts, startBalances, setStartBalances, txs } = useContext(AppCtx);
  const [collapsed, setCollapsed] = React.useState(true);
  const [saved, setSaved] = React.useState(false);
  const [newYear,  setNewYear]  = React.useState(()=>new Date().getFullYear());
  const [newMonth, setNewMonth] = React.useState(()=>new Date().getMonth());
  const [newValue, setNewValue] = React.useState("");
  const [newAccId, setNewAccId] = React.useState("acc-giro");

  // Alle vorhandenen Ankerpunkte aus beiden Formaten sammeln — inkl. alle Konten
  const allAnchors = React.useMemo(()=>{
    const result = [];
    Object.entries(startBalances||{}).forEach(([yearKey, yearVal])=>{
      const y = Number(yearKey);
      if(!yearVal || typeof yearVal !== "object") return;
      Object.entries(yearVal).forEach(([k, v])=>{
        if(k === "acc-giro" && typeof v === "number") {
          result.push({year:y, month:-1, value:v, accId:"acc-giro", key:`${y}/-1/acc-giro`,
            label:`31.12.${y-1} (Anfang ${y})`});
        } else if(!isNaN(Number(k)) && typeof v === "object") {
          const mo = Number(k);
          Object.entries(v).forEach(([accId, val])=>{
            if(typeof val === "number") {
              const accName = accounts.find(a=>a.id===accId)?.name || accId;
              result.push({year:y, month:mo, value:val, accId, key:`${y}/${mo}/${accId}`,
                label:`${String(mo+1).padStart(2,"0")}.${y} · ${accName}`});
            }
          });
        }
      });
    });
    return result.sort((a,b)=> (a.year*12+a.month) - (b.year*12+b.month)
      || a.accId.localeCompare(b.accId));
  }, [startBalances, accounts]);

  const saveAnchor = () => {
    const num = parseFloat(newValue.replace(",","."));
    if(isNaN(num)) return;
    const newSB = {
      ...startBalances,
      [newYear]: {
        ...(startBalances?.[newYear]||{}),
        [newMonth]: {
          ...((startBalances?.[newYear]?.[newMonth])||{}),
          [newAccId]: num,
        }
      }
    };
    setStartBalances(newSB);
    setNewValue("");
    setSaved(true); setTimeout(()=>setSaved(false), 2500);
  };

  const deleteAnchor = (anchor) => {
    if(!window.confirm("Anker-Kontostand wirklich löschen?")) return;
    const newSB = JSON.parse(JSON.stringify(startBalances||{}));
    if(anchor.month === -1) {
      if(newSB[anchor.year]) delete newSB[anchor.year]["acc-giro"];
    } else {
      if(newSB[anchor.year]?.[anchor.month]) {
        delete newSB[anchor.year][anchor.month][anchor.accId];
        if(Object.keys(newSB[anchor.year][anchor.month]).length === 0)
          delete newSB[anchor.year][anchor.month];
      }
    }
    setStartBalances(newSB);
  };

  return (
    <div style={{background:"rgba(255,255,255,0.03)",borderRadius:11,padding:"8px 12px",marginBottom:8,
      border:`1px solid ${T.bd}`}}>
      {/* Header — immer sichtbar, klickbar zum Ein-/Ausklappen */}
      <div onClick={()=>setCollapsed(v=>!v)}
        style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",
          padding:"4px 0",userSelect:"none"}}>
        {Li("landmark",14,T.blue)}
        <span style={{color:T.txt,fontSize:13,fontWeight:700,flex:1}}>
          Kontostand-Ankerpunkte
          {allAnchors.length>0&&<span style={{color:T.txt2,fontSize:10,fontWeight:400,marginLeft:6}}>
            ({allAnchors.length})
          </span>}
        </span>
        {Li(collapsed?"chevron-down":"chevron-up",13,T.txt2)}
      </div>
      {!collapsed&&<>
      <div style={{color:T.txt2,fontSize:11,margin:"6px 0 10px",lineHeight:1.5}}>
        Bekannte Kontostände als Ankerpunkte setzen. Die Berechnung startet immer vom nächstliegenden Ankerpunkt vor dem angezeigten Monat.
      </div>

      {/* Vorhandene Ankerpunkte */}
      {allAnchors.length > 0 && (
        <div style={{marginBottom:10}}>
          {allAnchors.map(a=>(
            <div key={a.key} style={{display:"flex",alignItems:"center",gap:8,
              background:"rgba(255,255,255,0.04)",borderRadius:8,padding:"5px 8px",marginBottom:3,
              border:`1px solid ${T.bd}`}}>
              <span style={{color:T.txt2,fontSize:10,flex:1}}>{a.label}</span>
              <span style={{color:T.pos,fontSize:12,fontWeight:700,fontFamily:"monospace"}}>
                {a.value>=0?"+":""}{a.value.toLocaleString("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2})} €
              </span>
              <button onClick={()=>deleteAnchor(a)}
                style={{background:"none",border:"none",color:T.neg,opacity:0.6,cursor:"pointer",padding:"2px"}}>
                {Li("trash-2",12)}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* CSV Import — mehrere CSVs auf einmal möglich */}
      <KontostandImportButton year={newYear} accId={newAccId} onImport={(saldo, date, resolvedAccId)=>{
        if(!date) return;
        const parts = date.split("-").map(Number);
        const iY = parts[0], iM = parts[1]-1; // 0-basiert
        const targetAccId = resolvedAccId || newAccId || "acc-giro";
        // Direkt als Ankerpunkt speichern
        setStartBalances(prev=>{
          const next = {
            ...prev,
            [iY]: {
              ...(prev?.[iY]||{}),
              [iM]: {
                ...((prev?.[iY]?.[iM])||{}),
                [targetAccId]: saldo,
              },
            }
          };
          return next;
        });
      }}/>

      {/* Neuen Ankerpunkt manuell setzen */}
      <div style={{marginTop:10,paddingTop:10,borderTop:`1px solid ${T.bd}`}}>
        <div style={{color:T.txt2,fontSize:11,marginBottom:6}}>Ankerpunkt manuell setzen:</div>
        <div style={{display:"flex",gap:6,alignItems:"flex-end",flexWrap:"wrap"}}>
          <div>
            <div style={{color:T.txt2,fontSize:10,marginBottom:2}}>Konto</div>
            <select value={newAccId} onChange={e=>setNewAccId(e.target.value)}
              style={{background:"rgba(255,255,255,0.06)",border:`1px solid ${T.bds}`,
                borderRadius:8,padding:"6px 8px",color:T.txt,fontSize:12,outline:"none",cursor:"pointer"}}>
              <option value="acc-giro" style={{background:T.surf2}}>Girokonto</option>
              {accounts.filter(a=>a.id!=="acc-giro").map(a=>(
                <option key={a.id} value={a.id} style={{background:T.surf2}}>{a.name}</option>
              ))}
            </select>
          </div>
          <div>
            <div style={{color:T.txt2,fontSize:10,marginBottom:2}}>Jahr</div>
            <input type="number" value={newYear} onChange={e=>setNewYear(Number(e.target.value))}
              style={{width:70,background:"rgba(255,255,255,0.06)",border:`1px solid ${T.bds}`,
                borderRadius:8,padding:"6px 8px",color:T.txt,fontSize:13,outline:"none",textAlign:"center"}}/>
          </div>
          <div>
            <div style={{color:T.txt2,fontSize:10,marginBottom:2}}>Monat (Endstand)</div>
            <select value={newMonth} onChange={e=>setNewMonth(Number(e.target.value))}
              style={{background:"rgba(255,255,255,0.06)",border:`1px solid ${T.bds}`,
                borderRadius:8,padding:"6px 8px",color:T.txt,fontSize:12,outline:"none",cursor:"pointer"}}>
              {["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"].map((m,i)=>(
                <option key={i} value={i} style={{background:T.surf2}}>{m}</option>
              ))}
            </select>
          </div>
          <div style={{flex:1,minWidth:90}}>
            <div style={{color:T.txt2,fontSize:10,marginBottom:2}}>Kontostand (€)</div>
            <input value={newValue} onChange={e=>setNewValue(e.target.value)}
              placeholder="0,00" inputMode="decimal"
              style={{width:"100%",background:"rgba(255,255,255,0.06)",border:`1px solid ${T.bds}`,
                borderRadius:8,padding:"6px 8px",color:T.txt,fontSize:13,fontWeight:700,
                textAlign:"right",outline:"none",fontFamily:"monospace",boxSizing:"border-box"}}/>
          </div>
          <button onClick={saveAnchor}
            style={{padding:"7px 12px",borderRadius:8,border:"none",
              background:newValue?T.blue:T.disabled,color:T.on_accent,fontSize:12,fontWeight:700,
              cursor:newValue?"pointer":"default",opacity:newValue?1:0.4,
              fontFamily:"inherit",flexShrink:0}}>
            {Li("plus",13,T.on_accent)} Setzen
          </button>
        </div>
      </div>
      {saved&&<div style={{color:T.pos,fontSize:11,textAlign:"center",marginTop:8}}>✓ Gespeichert & in Supabase übertragen</div>}
      </>}
    </div>
  );
}

export { StartBalanceEditor };
