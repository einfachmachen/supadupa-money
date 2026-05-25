// Auto-generated module (siehe app-src.jsx)

import React, { useContext, useState } from "react";
import { MobileCatStep } from "../molecules/MobileCatStep.jsx";
import { MobileNewAccOverlay } from "../molecules/MobileNewAccOverlay.jsx";
import { MobileWiederkehrendModal } from "./MobileWiederkehrendModal.jsx";
import { AppCtx } from "../../state/AppContext.js";
import { theme as T } from "../../theme/activeTheme.js";
import { fmt, pn, uid } from "../../utils/format.js";
import { Li } from "../../utils/icons.jsx";

function MobileVormerkenModal({onClose}) {
  const { cats, setCats, accounts, setAccounts, txs, setTxs, year, month, getCat, getSub } = useContext(AppCtx);
  const pad = n => String(n).padStart(2,"0");
  const today = new Date().toISOString().split("T")[0];

  const [step, setStep] = useState(1); // 1=Betrag, 2=Kategorie, 3=Details, 4=Bestätigung
  const [csvType, setCsvType] = useState("expense");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today);
  const [desc, setDesc] = useState("");
  const [valueDate, setValueDate] = useState(""); // Verursacherdatum
  const [note, setNote] = useState("");
  const [catId, setCatId] = useState("");
  const [subId, setSubId] = useState("");
  const [accId, setAccId] = useState(accounts?.[0]?.id||"acc-giro");
  const [catStep, setCatStep] = useState("cat"); // "cat" | "sub"
  const [selCat, setSelCat] = useState(null);
  const [showNewCat, setShowNewCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatType, setNewCatType] = useState("expense");
  const [saved, setSaved] = useState(false);
  const [showNewAcc, setShowNewAcc] = useState(false);
  const [newAccName, setNewAccName] = useState("");
  const [newAccIcon, setNewAccIcon] = useState("landmark");
  const [newAccColor,setNewAccColor]= useState(T.blue);
  const [newAccDelay,setNewAccDelay]= useState("");

  const S = {fs:26, fsL:64, pad:10, padL:14, radius:16, gap:14};
  const expCats = cats.filter(c=>c.type==="expense"||c.type==="tagesgeld");
  const incCats = cats.filter(c=>c.type==="income");
  const shownCats = csvType==="expense" ? expCats : incCats;

  const btnBase = {
    width:"100%", padding:`${S.padL}px`, borderRadius:S.radius,
    border:"none", cursor:"pointer", fontFamily:"inherit",
    fontSize:S.fs, fontWeight:700, display:"flex",
    alignItems:"center", justifyContent:"flex-start", gap:10,
    textAlign:"left",
  };
  const btnCenter = {...btnBase, justifyContent:"center"};

  const fieldLabel = (txt) => (
    <div style={{color:T.txt2,fontSize:S.fs-3,marginBottom:6,fontWeight:600}}>{txt}</div>
  );


  const header = (title, sub, stepNum, onBack) => (
    <div style={{background:T.surf,borderBottom:`1px solid ${T.bd}`,
      padding:`12px ${S.padL}px`,display:"flex",alignItems:"center",
      gap:12,flexShrink:0}}>
      <button onClick={onBack||onClose}
        style={{background:"rgba(255,255,255,0.08)",border:"none",color:T.txt2,
          width:44,height:44,borderRadius:S.radius,cursor:"pointer",
          fontSize:20,display:"flex",alignItems:"center",justifyContent:"center",
          flexShrink:0}}>
        ←
      </button>
      <div style={{flex:1,minWidth:0}}>
        <div style={{color:T.txt,fontSize:S.fs+2,fontWeight:700,
          whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{title}</div>
        <div style={{color:T.txt2,fontSize:S.fs-6,marginTop:2,
          display:"flex",alignItems:"center",gap:8}}>
          <span style={{color:T.blue,fontWeight:700}}>{stepNum}v4</span>
          <span>{sub}</span>
        </div>
      </div>
    </div>
  );

  const doSave = () => {
    const amt = pn(amount.replace(",","."));
    if(amt<=0) return;
    setTxs(p=>[...p,{
      id:uid(), date, desc:desc||"neue Buchung",
      totalAmount:amt, pending:true, _csvType:csvType,
      accountId:accId, repeatMonths:1,
      note: note||undefined,
      valueDate: valueDate||undefined,
      splits:[{id:uid(),catId,subId,amount:amt}],
    }]);
    setSaved(true);
    setTimeout(()=>onClose(), 1200);
  };

  if(showNewAcc) return (
    <MobileNewAccOverlay S={S} onClose={(newId)=>{
      setShowNewAcc(false);
      if(newId) setAccId(newId);
    }}/>
  );

  if(saved) return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",
      zIndex:300,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:64,marginBottom:16}}>✓</div>
        <div style={{color:T.pos,fontSize:24,fontWeight:700}}>Gespeichert!</div>
      </div>
    </div>
  );

  return (
    <div className="mobile-modal" style={{position:"fixed",inset:0,background:T.bg,zIndex:300,
      display:"flex",flexDirection:"column",overflowY:"auto",
      "--mob-fs": S.fs+"px"}}>

      {/* ── Schritt 1: Betrag ── */}
      {step===1&&<>
        {header("neue Vormerkung","Betrag & Typ",1)}
        <div style={{flex:1,padding:S.padL,overflowY:"auto",WebkitOverflowScrolling:"touch"}}>

          {/* Ausgabe / Einnahme */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:S.gap,marginBottom:S.gap}}>
            {[["expense","Ausgabe",T.neg],["income","Einnahme",T.pos]].map(([t,l,c])=>(
              <button key={t} onClick={()=>setCsvType(t)}
                style={{...btnCenter, padding:`${S.padL}px`,
                  background:csvType===t?c+"22":"rgba(255,255,255,0.06)",
                  border:`2px solid ${csvType===t?c:T.bd}`,
                  color:csvType===t?c:T.txt2, borderRadius:S.radius}}>
                {l}
              </button>
            ))}
          </div>

          {/* Konto — Label nur wenn kein Konto vorhanden */}
          {(accounts||[]).length===0&&(
            <div style={{color:T.txt2,fontSize:S.fs-4,marginBottom:6,fontWeight:600}}>Konto</div>
          )}
          <div style={{display:"flex",gap:S.gap/2,flexWrap:"wrap",marginBottom:S.gap}}>
            {(accounts||[]).map(acc=>(
              <button key={acc.id} onClick={()=>setAccId(acc.id)}
                style={{flex:"1 1 auto",padding:`${S.pad}px`,borderRadius:S.radius,
                  background:accId===acc.id?acc.color+"22":"rgba(255,255,255,0.06)",
                  border:`2px solid ${accId===acc.id?(acc.color||T.blue):T.bd}`,
                  color:accId===acc.id?(acc.color||T.blue):T.txt2,
                  cursor:"pointer",fontFamily:"inherit",
                  display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                {acc.delayDays>0 ? (
                  <div style={{display:"flex",alignItems:"center",gap:4}}>
                    {Li(acc.icon||"landmark",S.fs+4,accId===acc.id?(acc.color||T.blue):T.txt2)}
                    <span style={{fontSize:S.fs-8,color:T.gold,fontWeight:700,
                      background:T.gold+"22",borderRadius:4,padding:"1px 5px"}}>
                      +{acc.delayDays}
                    </span>
                  </div>
                ) : <>
                  {Li(acc.icon||"landmark",S.fs+4,accId===acc.id?(acc.color||T.blue):T.txt2)}
                  <span style={{fontSize:S.fs-6,fontWeight:accId===acc.id?700:400}}>
                    {acc.name||acc.id}
                  </span>
                </>}
              </button>
            ))}
            <button onClick={()=>setShowNewAcc(true)}
              style={{flex:"1 1 auto",padding:`${S.pad}px`,borderRadius:S.radius,
                background:"rgba(74,159,212,0.06)",
                border:`1.5px dashed ${T.blue}66`,color:T.blue,
                cursor:"pointer",fontFamily:"inherit",
                display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
              {Li("plus",S.fs,T.blue)}
              <span style={{fontSize:S.fs-8}}>Konto</span>
            </button>
          </div>

          {/* Betrag — Placeholder statt Label, € nach Eingabe */}
          <div style={{position:"relative",marginBottom:S.gap}}>
            <input
              type="text" inputMode="decimal" value={amount}
              onChange={e=>setAmount(e.target.value.replace(/[^0-9,.]/g,""))}
              placeholder="Betrag €"
              style={{width:"100%",boxSizing:"border-box",
                padding:`${S.padL}px`,paddingRight:`${S.padL+S.fs}px`,
                borderRadius:S.radius,
                border:`2px solid ${amount?T.blue:T.bd}`,
                background:"rgba(255,255,255,0.06)",color:T.txt,
                fontSize:S.fs,fontWeight:700,fontFamily:"monospace",
                textAlign:"right",outline:"none"}}
            />
            {amount&&<span style={{position:"absolute",right:S.padL,top:"50%",
              transform:"translateY(-50%)",color:T.txt2,fontSize:S.fs,
              pointerEvents:"none",fontWeight:700}}>€</span>}
          </div>

          {/* verursacht — Klick füllt heute, eigene Zeile */}
          <div style={{position:"relative",marginBottom:S.gap}}>
            {!valueDate&&<div onClick={()=>setValueDate(today)}
              style={{position:"absolute",inset:0,display:"flex",alignItems:"center",
                paddingLeft:S.padL,color:T.txt2,fontSize:S.fs-4,
                cursor:"pointer",borderRadius:S.radius,zIndex:1}}>
              {Li("calendar",S.fs-4,T.txt2)}
              <span style={{marginLeft:8}}>verursacht (optional) — tippe für heute</span>
            </div>}
            <input type="date" value={valueDate} onChange={e=>setValueDate(e.target.value)}
              style={{width:"100%",boxSizing:"border-box",padding:`${S.padL}px`,
                borderRadius:S.radius,border:`2px solid ${valueDate?T.blue:T.bd}`,
                background:"rgba(255,255,255,0.06)",
                color:valueDate?T.txt:"transparent",
                fontSize:S.fs,fontFamily:"inherit",outline:"none",colorScheme:"dark"}}/>
            {valueDate&&<button onClick={()=>setValueDate("")}
              style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",
                background:"none",border:"none",color:T.txt2,cursor:"pointer",
                fontSize:S.fs,padding:4}}>✕</button>}
          </div>

          {/* Buchung am — nächster Banktag als Default */}
          <div style={{position:"relative",marginBottom:S.gap}}>
            {!date&&<div onClick={()=>{
              // Nächster Banktag: Mo-Fr, kein Wochenende
              const d=new Date(); d.setDate(d.getDate()+1);
              while(d.getDay()===0||d.getDay()===6) d.setDate(d.getDate()+1);
              setDate(d.toISOString().split("T")[0]);
            }} style={{position:"absolute",inset:0,display:"flex",alignItems:"center",
                paddingLeft:S.padL,color:T.txt2,fontSize:S.fs-4,
                cursor:"pointer",borderRadius:S.radius,zIndex:1}}>
              {Li("calendar",S.fs-4,T.txt2)}
              <span style={{marginLeft:8}}>Buchung am — tippe für nächsten Banktag</span>
            </div>}
            <input type="date" value={date} onChange={e=>setDate(e.target.value)}
              style={{width:"100%",boxSizing:"border-box",padding:`${S.padL}px`,
                borderRadius:S.radius,border:`2px solid ${date?T.blue:T.bd}`,
                background:"rgba(255,255,255,0.06)",
                color:date?T.txt:"transparent",
                fontSize:S.fs,fontFamily:"inherit",outline:"none",colorScheme:"dark"}}/>
            {date&&<button onClick={()=>setDate("")}
              style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",
                background:"none",border:"none",color:T.txt2,cursor:"pointer",
                fontSize:S.fs,padding:4}}>✕</button>}
          </div>

          <button onClick={()=>{ const a=pn(amount.replace(",",".")); if(a>0) setStep(2); }}
            disabled={!amount||pn(amount.replace(",","."))<= 0}
            style={{...btnCenter,
              background:amount&&pn(amount.replace(",",".")>0)?T.blue:"rgba(255,255,255,0.1)",
              color:amount&&pn(amount.replace(",",".")>0)?"#fff":T.txt2}}>
            Weiter → Kategorie
          </button>
        </div>
      </>}

      {/* ── Schritt 2: Kategorie ── */}
      {step===2&&<>
        {header("Kategorie",fmt(pn(amount.replace(",","."))),2,()=>setStep(1))}
        <div style={{flex:1,padding:S.padL,overflowY:"auto",WebkitOverflowScrolling:"touch"}}>
          <MobileCatStep
            csvType={csvType}
            catId={catId} subId={subId}
            onSelect={(cId,sId)=>{setCatId(cId);setSubId(sId);setStep(3);}}
            S={S} btnBase={btnBase} btnCenter={btnCenter}
          />
          <button onClick={()=>{setCatId("");setSubId("");setStep(3);}}
            style={{...btnBase,marginTop:S.gap*2,
              background:"rgba(255,255,255,0.04)",
              border:`1.5px dashed ${T.bd}`,color:T.txt2,fontWeight:400,
              justifyContent:"center"}}>
            Ohne Kategorie überspringen
          </button>
        </div>
      </>}

      {/* ── Schritt 3: Details ── */}
      {step===3&&<>
        {header("details","Beschreibung & Notiz",3,()=>setStep(2))}
        <div style={{flex:1,padding:S.padL,overflowY:"auto",WebkitOverflowScrolling:"touch"}}>

          {/* Beschreibung — auto-grow, Placeholder */}
          <textarea value={desc} onChange={e=>setDesc(e.target.value)}
            placeholder="Beschreibung (Pflichtfeld)"
            rows={1}
            style={{width:"100%",boxSizing:"border-box",
              padding:`${S.padL}px`,borderRadius:S.radius,
              border:`2px solid ${desc?T.blue:T.neg}`,
              background:"rgba(255,255,255,0.06)",color:T.txt,
              fontSize:S.fs,fontFamily:"inherit",outline:"none",resize:"none",
              lineHeight:1.5,overflow:"hidden",marginBottom:S.gap,
              minHeight:S.fs*1.5+S.padL*2}}
            onInput={e=>{e.target.style.height="auto";e.target.style.height=e.target.scrollHeight+"px";}}
          />

          {/* Notiz — auto-grow, Placeholder */}
          <textarea value={note} onChange={e=>setNote(e.target.value)}
            placeholder="Notiz (optional)"
            rows={1}
            style={{width:"100%",boxSizing:"border-box",
              padding:`${S.padL}px`,borderRadius:S.radius,
              border:`2px solid ${note?T.blue:T.bd}`,
              background:"rgba(255,255,255,0.06)",color:T.txt,
              fontSize:S.fs,fontFamily:"inherit",outline:"none",resize:"none",
              lineHeight:1.5,overflow:"hidden",marginBottom:S.gap,
              minHeight:S.fs*1.5+S.padL*2}}
            onInput={e=>{e.target.style.height="auto";e.target.style.height=e.target.scrollHeight+"px";}}
          />

          <button onClick={()=>{ if(desc.trim()) setStep(4); }}
            disabled={!desc.trim()}
            style={{...btnCenter,
              background:desc.trim()?T.blue:"rgba(255,255,255,0.1)",
              color:desc.trim()?"#fff":T.txt2}}>
            Weiter → Bestätigen
          </button>
        </div>
      </>}

      {/* ── Schritt 4: Bestätigung ── */}
      {step===4&&<>
        {header("bestätigen","Alles korrekt?",4,()=>setStep(3))}
        <div style={{flex:1,padding:S.padL,overflowY:"auto",WebkitOverflowScrolling:"touch"}}>
          {[
            ["Typ",            csvType==="expense"?"Ausgabe":"Einnahme"],
            ["Konto",          (accounts||[]).find(a=>a.id===accId)?.name||accId],
            ["Betrag",         (csvType==="expense"?"−":"+")+fmt(pn(amount.replace(",",".")))],
            ["verursacht", valueDate?valueDate.split("-").reverse().join("."):"—"],
            ["Buchung am", date?date.split("-").reverse().join("."):"—"],
            ["Kategorie",      catId?(getCat(catId)?.name||"?")+(subId?" / "+(getSub(catId,subId)?.name||""):""):"—"],
            ["Beschreibung",   desc],
            ["Notiz",          note||"—"],
          ].map(([k,v])=>(
            <div key={k} style={{display:"flex",justifyContent:"space-between",
              padding:`${S.gap}px 0`,
              borderBottom:`1px solid ${T.bd}`,alignItems:"flex-start",gap:16}}>
              <span style={{color:T.txt2,fontSize:S.fs,flexShrink:0}}>{k}</span>
              <span style={{color:T.txt,fontSize:S.fs,fontWeight:600,
                textAlign:"right",flex:1,wordBreak:"break-word"}}>{v}</span>
            </div>
          ))}

          <button onClick={doSave}
            style={{...btnCenter,background:T.pos,color:"#fff",marginTop:S.gap*2}}>
            ✓ Vormerkung speichern
          </button>
          <button onClick={onClose}
            style={{...btnCenter,background:"transparent",
              border:`1.5px solid ${T.bd}`,color:T.txt2,
              marginTop:S.gap,fontWeight:400}}>
            Abbrechen
          </button>
        </div>
      </>}


    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// MobileWiederkehrendModal — 4 Schritte für Wiederkehrend & Finanzierung

export { MobileVormerkenModal };
