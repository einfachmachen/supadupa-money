// Auto-generated module (siehe app-src.jsx)

import React, { useMemo, useState } from "react";
import { KontostandImportButton } from "../buttons/KontostandImportButton.jsx";
import { theme as T } from "../../theme/activeTheme.js";
import { Li } from "../../utils/icons.jsx";

function AnchorSection({selAccId, accounts, startBalances, setStartBalances, mobileMode, MFSl}) {
  const [anchorOpen,  setAnchorOpen]  = useState(false);
  const [anchorYear,  setAnchorYear]  = useState(()=>new Date().getFullYear());
  const [anchorMonth, setAnchorMonth] = useState(()=>new Date().getMonth());
  const [anchorValue, setAnchorValue] = useState("");
  const [anchorSaved, setAnchorSaved] = useState(false);

  const allAnchors = useMemo(()=>{
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
    return result.sort((a,b)=>(a.year*12+a.month)-(b.year*12+b.month)||a.accId.localeCompare(b.accId));
  }, [startBalances, accounts]);

  // Nur Ankerpunkte des gewählten Kontos anzeigen
  const filteredAnchors = useMemo(()=>{
    if(!selAccId) return allAnchors;
    return allAnchors.filter(a=>a.accId===selAccId);
  }, [allAnchors, selAccId]);

  const saveAnchor = () => {
    const num = parseFloat(anchorValue.replace(",","."));
    if(isNaN(num)) return;
    const targetAccId = selAccId || accounts[0]?.id || "acc-giro";
    setStartBalances(prev=>({
      ...prev,
      [anchorYear]: {
        ...(prev?.[anchorYear]||{}),
        [anchorMonth]: { ...((prev?.[anchorYear]?.[anchorMonth])||{}), [targetAccId]: num }
      }
    }));
    setAnchorValue("");
    setAnchorSaved(true); setTimeout(()=>setAnchorSaved(false), 2000);
  };

  const deleteAnchor = (anchor) => {
    if(!window.confirm("Ankerpunkt wirklich löschen?")) return;
    const newSB = JSON.parse(JSON.stringify(startBalances||{}));
    if(anchor.month === -1) { if(newSB[anchor.year]) delete newSB[anchor.year]["acc-giro"]; }
    else {
      if(newSB[anchor.year]?.[anchor.month]) {
        delete newSB[anchor.year][anchor.month][anchor.accId];
        if(Object.keys(newSB[anchor.year][anchor.month]).length===0) delete newSB[anchor.year][anchor.month];
      }
    }
    setStartBalances(newSB);
  };

  const activeAcc = accounts.find(a=>a.id===selAccId);

  return (
    <div style={{marginBottom:10,borderRadius:11,border:`1px solid ${anchorOpen?T.blue+"55":T.bd}`,
      background:"rgba(255,255,255,0.03)",overflow:"hidden"}}>
      <div onClick={()=>setAnchorOpen(v=>!v)}
        style={{display:"flex",alignItems:"center",gap:8,padding:mobileMode?"12px 16px":"8px 12px",cursor:"pointer"}}>
        {Li("landmark",mobileMode?18:13,T.blue)}
        <div style={{flex:1}}>
          <div style={{color:T.blue,fontSize:mobileMode?16:12,fontWeight:700}}>
            Kontostand-Ankerpunkte
            {filteredAnchors.length>0&&<span style={{color:T.txt2,fontWeight:400,marginLeft:6,fontSize:mobileMode?13:10}}>({filteredAnchors.length})</span>}
          </div>
          {!anchorOpen&&<div style={{color:T.txt2,fontSize:mobileMode?12:9,marginTop:1}}>
            {activeAcc ? `Konto: ${activeAcc.name} · ` : ""}Manuell setzen oder aus CSV erkennen
          </div>}
        </div>
        {Li(anchorOpen?"chevron-up":"chevron-down",mobileMode?16:13,T.txt2)}
      </div>

      {anchorOpen&&(
        <div style={{padding:mobileMode?"0 16px 16px":"0 12px 12px",borderTop:`1px solid ${T.bd}`}}>
          <div style={{color:T.txt2,fontSize:mobileMode?13:10,margin:"8px 0 10px",lineHeight:1.5}}>
            Ankerpunkte für „{activeAcc?.name||"gewähltes Konto"}". {allAnchors.length>filteredAnchors.length?`(${allAnchors.length} gesamt über alle Konten)`:""}
          </div>

          {filteredAnchors.length>0&&(
            <div style={{marginBottom:10}}>
              {filteredAnchors.map(a=>{
                const aAcc = accounts.find(x=>x.id===a.accId);
                return (
                  <div key={a.key} style={{display:"flex",alignItems:"center",gap:8,
                    background:"rgba(255,255,255,0.04)",borderRadius:8,
                    padding:mobileMode?"8px 10px":"5px 8px",marginBottom:3,border:`1px solid ${T.bd}`}}>
                    {aAcc&&<span style={{background:(aAcc.color||T.blue)+"22",color:aAcc.color||T.blue,
                      borderRadius:4,padding:"1px 5px",fontSize:mobileMode?11:9,fontWeight:700}}>{aAcc.name}</span>}
                    <span style={{color:T.txt2,fontSize:mobileMode?13:10,flex:1}}>{a.label}</span>
                    <span style={{color:T.pos,fontSize:mobileMode?14:12,fontWeight:700,fontFamily:"monospace"}}>
                      {a.value>=0?"+":""}{a.value.toLocaleString("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2})} €
                    </span>
                    <button onClick={()=>deleteAnchor(a)}
                      style={{background:"none",border:"none",color:T.neg,opacity:0.6,cursor:"pointer",padding:"2px"}}>
                      {Li("trash-2",mobileMode?16:12)}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <KontostandImportButton year={anchorYear} accId={selAccId||accounts[0]?.id||"acc-giro"}
            onImport={(saldo, date)=>{
              if(!date) return;
              const parts = date.split("-").map(Number);
              const iY = parts[0], iM = parts[1]-1;
              const targetAccId = selAccId || accounts[0]?.id || "acc-giro";
              setStartBalances(prev=>({
                ...prev,
                [iY]: { ...(prev?.[iY]||{}),
                  [iM]: { ...((prev?.[iY]?.[iM])||{}), [targetAccId]: saldo }
                }
              }));
            }}/>

          <div style={{marginTop:10,paddingTop:10,borderTop:`1px solid ${T.bd}`}}>
            <div style={{color:T.txt2,fontSize:mobileMode?13:10,marginBottom:6,fontWeight:600}}>Manuell setzen:</div>
            <div style={{display:"flex",gap:6,alignItems:"flex-end",flexWrap:"wrap"}}>
              <div>
                <div style={{color:T.txt2,fontSize:mobileMode?12:9,marginBottom:2}}>Jahr</div>
                <input type="number" value={anchorYear} onChange={e=>setAnchorYear(Number(e.target.value))}
                  style={{width:70,background:"rgba(255,255,255,0.06)",border:`1px solid ${T.bds}`,
                    borderRadius:8,padding:"6px 8px",color:T.txt,fontSize:mobileMode?15:13,outline:"none",textAlign:"center"}}/>
              </div>
              <div>
                <div style={{color:T.txt2,fontSize:mobileMode?12:9,marginBottom:2}}>Monat</div>
                <select value={anchorMonth} onChange={e=>setAnchorMonth(Number(e.target.value))}
                  style={{background:"rgba(255,255,255,0.06)",border:`1px solid ${T.bds}`,
                    borderRadius:8,padding:"6px 8px",color:T.txt,fontSize:mobileMode?15:12,outline:"none",cursor:"pointer"}}>
                  {["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"].map((m,i)=>(
                    <option key={i} value={i} style={{background:T.surf2}}>{m}</option>
                  ))}
                </select>
              </div>
              <div style={{flex:1,minWidth:90}}>
                <div style={{color:T.txt2,fontSize:mobileMode?12:9,marginBottom:2}}>Kontostand (€)</div>
                <input value={anchorValue} onChange={e=>setAnchorValue(e.target.value)}
                  placeholder="0,00" inputMode="decimal"
                  style={{width:"100%",background:"rgba(255,255,255,0.06)",border:`1px solid ${T.bds}`,
                    borderRadius:8,padding:"6px 8px",color:T.txt,fontSize:mobileMode?16:13,fontWeight:700,
                    textAlign:"right",outline:"none",fontFamily:"monospace",boxSizing:"border-box"}}/>
              </div>
              <button onClick={saveAnchor}
                style={{padding:mobileMode?"10px 16px":"7px 12px",borderRadius:8,border:"none",
                  background:anchorValue?T.blue:"rgba(255,255,255,0.1)",
                  color:anchorValue?"#fff":T.txt2,fontSize:mobileMode?15:12,fontWeight:700,
                  cursor:anchorValue?"pointer":"default",opacity:anchorValue?1:0.4,fontFamily:"inherit"}}>
                {Li("plus",mobileMode?16:13,anchorValue?"#fff":T.txt2)} Setzen
              </button>
            </div>
            {anchorSaved&&<div style={{color:T.pos,fontSize:mobileMode?13:11,textAlign:"center",marginTop:8}}>✓ Ankerpunkt gespeichert</div>}
          </div>
        </div>
      )}
    </div>
  );
}

export { AnchorSection };
