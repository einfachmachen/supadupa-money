// Auto-generated module (siehe app-src.jsx)

import React, { useContext, useState } from "react";
import { SubNameField } from "../atoms/SubNameField.jsx";
import { MobileCatStep } from "../molecules/MobileCatStep.jsx";
import { MobileNewAccOverlay } from "../molecules/MobileNewAccOverlay.jsx";
import { MobileKategorienModal } from "./MobileKategorienModal.jsx";
import { AppCtx } from "../../state/AppContext.js";
import { theme as T } from "../../theme/activeTheme.js";
import { isoAddMonths } from "../../utils/date.js";
import { fmt, pn, uid } from "../../utils/format.js";
import { Li } from "../../utils/icons.jsx";

function MobileWiederkehrendModal({onClose, typ="wiederkehrend"}) {
  const { cats, setCats, accounts, setAccounts, setTxs, getCat, getSub } = useContext(AppCtx);
  const today = new Date().toISOString().split("T")[0];
  const S = {fs:26, pad:10, padL:14, radius:16, gap:14};
  const isFinanz = typ==="finanzierung";

  const [step,         setStep]         = useState(1);
  const [csvType,      setCsvType]      = useState("expense");
  const [accId,        setAccId]        = useState(accounts?.[0]?.id||"");
  const [amount,       setAmount]       = useState("");
  const [interval_,    setInterval_]    = useState(1);
  const [lastOfMon,    setLastOfMon]    = useState(false);
  const [count,        setCount]        = useState("");
  const [endDate,      setEndDate]      = useState("");
  const [startDate,    setStartDate]    = useState(today);
  const [customFL,     setCustomFL]     = useState(false);
  const [firstAmount,  setFirstAmount]  = useState("");
  const [lastAmount,   setLastAmount]   = useState("");
  const [catId,        setCatId]        = useState("");
  const [subId,        setSubId]        = useState("");
  const [catStep,      setCatStep]      = useState("cat");
  const [selCat,       setSelCat]       = useState(null);
  const [showNewCat,   setShowNewCat]   = useState(false);
  const [newCatName,   setNewCatName]   = useState("");
  const [newCatType,   setNewCatType]   = useState("expense");
  const [desc,         setDesc]         = useState("");
  const [note,         setNote]         = useState("");
  const [valueDate,    setValueDate]    = useState("");
  const [firstIsStart, setFirstIsStart] = useState(false);
  const [giltFuer,     setGiltFuer]     = useState("all");
  const [giltFuerDate, setGiltFuerDate] = useState(today);
  const [saved,        setSaved]        = useState(false);
  const [showNewAcc,   setShowNewAcc]   = useState(false);

  const shownCats = cats.filter(c=>csvType==="income"?c.type==="income":c.type!=="income");
  const calcCount = () => {
    if(count) return parseInt(count)||1;
    if(endDate&&startDate){
      const s=new Date(startDate),e=new Date(endDate);
      return Math.max(1,Math.round(((e.getFullYear()-s.getFullYear())*12+(e.getMonth()-s.getMonth()))/interval_)+1);
    }
    // 7 Jahre ab Startdatum
    const s=new Date(startDate||today);
    const endY=s.getFullYear()+6;
    return Math.max(1,Math.round(((endY-s.getFullYear())*12+(11-s.getMonth()))/interval_)+1);
  };
  const totalCount = calcCount();
  const intervalLabel = {1:"monatlich",3:"quartalsweise",6:"halbjährlich",12:"jährlich"}[interval_]||`alle ${interval_} Monate`;
  const amt = ()=>pn(amount.replace(",","."));
  const gesamtbetrag = isFinanz&&amt()>0 ? fmt(amt()*totalCount) : null;

  const btnBase = {width:"100%",padding:`${S.padL}px`,borderRadius:S.radius,
    border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:S.fs,fontWeight:700,
    display:"flex",alignItems:"center",justifyContent:"flex-start",gap:10,textAlign:"left"};
  const btnCenter = {...btnBase,justifyContent:"center"};

  const fieldLabel = (txt,required=false) => (
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
      <div style={{color:T.txt2,fontSize:S.fs-4,fontWeight:600}}>{txt}</div>
      {required&&<div style={{background:T.neg+"22",color:T.neg,fontSize:S.fs-8,
        borderRadius:6,padding:"2px 8px",fontWeight:700}}>Pflicht</div>}
    </div>
  );

  const inp = (extra={}) => ({width:"100%",boxSizing:"border-box",
    padding:`${S.padL}px`,borderRadius:S.radius,
    background:"rgba(255,255,255,0.06)",color:T.txt,
    fontSize:S.fs,fontFamily:"inherit",outline:"none",
    border:`2px solid ${T.bd}`,...extra});

  const header = (title,sub,stepNum,onBack) => (
    <div style={{background:T.surf,borderBottom:`1px solid ${T.bd}`,
      padding:`12px ${S.padL}px`,display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
      <button onClick={onBack||onClose}
        style={{background:"rgba(255,255,255,0.08)",border:"none",color:T.txt2,
          width:44,height:44,borderRadius:S.radius,cursor:"pointer",fontSize:20,
          display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>←</button>
      <div style={{flex:1,minWidth:0}}>
        <div style={{color:T.txt,fontSize:S.fs+2,fontWeight:700,
          whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{title}</div>
        <div style={{color:T.txt2,fontSize:S.fs-6,marginTop:2,display:"flex",gap:8}}>
          <span style={{color:T.blue,fontWeight:700}}>{stepNum}v4</span>
          <span>{sub}</span>
        </div>
      </div>
    </div>
  );

  const doSave = () => {
    const a = amt();
    if(a<=0||!desc.trim()) return;
    const n = totalCount;
    const seriesId = uid();
    const firstAmt = customFL&&firstAmount ? pn(firstAmount.replace(",",".")) : null;
    const lastAmt  = customFL&&lastAmount  ? pn(lastAmount.replace(",","."))  : null;
    const newTxs = Array.from({length:n},(_,i)=>{
      const offset = (!firstIsStart || i>0) ? i*interval_ : 0;
      const date = isoAddMonths(startDate, offset, lastOfMon);
      const txAmt = (i===0&&firstAmt!=null)?firstAmt:(i===n-1&&lastAmt!=null)?lastAmt:a;
      return {
        id:uid(), date, desc:desc.trim(), totalAmount:txAmt, pending:true,
        _csvType:csvType, accountId:accId, repeatMonths:interval_,
        note:note||undefined,
        valueDate: i===0&&valueDate ? valueDate : undefined,
        splits:catId?[{id:uid(),catId,subId:subId||"",amount:txAmt}]:[],
        _seriesId:seriesId, _seriesIdx:i+1, _seriesTotal:n,
        ...(isFinanz?{_seriesTyp:"finanzierung"}:{}),
        ...(lastOfMon?{_lastOfMonth:true}:{}),
      };
    });
    setTxs(p=>[...p,...newTxs]);
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
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:300,
      display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column"}}>
      <div style={{fontSize:64,marginBottom:16}}>✓</div>
      <div style={{color:T.pos,fontSize:24,fontWeight:700}}>{totalCount}× gespeichert!</div>
    </div>
  );

  return (
    <div className="mobile-modal" style={{position:"fixed",inset:0,background:T.bg,
      zIndex:300,display:"flex",flexDirection:"column","--mob-fs":S.fs+"px"}}>

      {/* ── Schritt 1: Betrag & Rhythmus ── */}
      {step===1&&<>
        {header(isFinanz?"neue Finanzierung":"neue Wiederkehrende","Betrag & Rhythmus",1)}
        <div style={{flex:1,padding:S.padL,overflowY:"auto",WebkitOverflowScrolling:"touch"}}>

          {/* Ausgabe / Einnahme */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:S.gap,marginBottom:S.gap}}>
            {[["expense","Ausgabe",T.neg],["income","Einnahme",T.pos]].map(([t,l,c])=>(
              <button key={t} onClick={()=>setCsvType(t)}
                style={{...btnCenter,padding:`${S.padL}px`,
                  background:csvType===t?c+"22":"rgba(255,255,255,0.06)",
                  border:`2px solid ${csvType===t?c:T.bd}`,
                  color:csvType===t?c:T.txt2,borderRadius:S.radius}}>
                {l}
              </button>
            ))}
          </div>

          {/* Konto — Label nur wenn noch keins vorhanden */}
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

          {/* Betrag — Placeholder statt Label */}
          <input type="text" inputMode="decimal" value={amount}
            onChange={e=>setAmount(e.target.value.replace(/[^0-9,\.]/g,""))}
            placeholder={isFinanz?"Rate €":"Betrag €"}
            style={{...inp({border:`2px solid ${amount?T.blue:T.bd}`,
              fontWeight:700,textAlign:"right",marginBottom:S.gap})}}/>

          {/* Rhythmus */}
          {fieldLabel("Rhythmus")}
          <div style={{display:"flex",gap:S.gap/2,marginBottom:S.gap}}>
            {[[1,"monatl."],[3,"quartl."],[6,"halbj."],[12,"jährl."]].map(([v,l])=>(
              <button key={v} onClick={()=>setInterval_(v)}
                style={{flex:1,...btnCenter,padding:`${S.pad}px 4px`,
                  background:interval_===v?T.blue:"rgba(255,255,255,0.08)",
                  border:"none",color:interval_===v?"#fff":T.txt2,
                  fontSize:S.fs-4,fontWeight:700,borderRadius:S.radius/2}}>
                {l}
              </button>
            ))}
          </div>

          {/* Letzter Tag */}
          <div onClick={()=>{
            const next=!lastOfMon; setLastOfMon(next);
            if(next&&startDate){
              const[y,m]=startDate.split("-").map(Number);
              const ld=new Date(y,m,0).getDate();
              setStartDate(`${y}-${String(m).padStart(2,"0")}-${String(ld).padStart(2,"0")}`);
            }
          }} style={{display:"flex",alignItems:"center",gap:12,padding:`${S.pad}px ${S.padL}px`,
            borderRadius:S.radius,cursor:"pointer",marginBottom:S.gap,
            background:lastOfMon?"rgba(74,159,212,0.12)":"rgba(255,255,255,0.04)",
            border:`2px solid ${lastOfMon?T.blue:T.bd}`}}>
            <div style={{width:44,height:26,borderRadius:13,position:"relative",flexShrink:0,
              background:lastOfMon?T.blue:"rgba(255,255,255,0.15)",transition:"background 0.2s"}}>
              <div style={{position:"absolute",top:3,left:lastOfMon?21:3,width:20,height:20,
                borderRadius:"50%",background:"#fff",transition:"left 0.2s"}}/>
            </div>
            <span style={{color:lastOfMon?T.txt:T.txt2,fontSize:S.fs}}>
              Immer letzter Tag des Monats
            </span>
          </div>

          {/* Anzahl / Enddatum */}
          <div style={{display:"flex",gap:S.gap,marginBottom:S.gap/2}}>
            <div style={{flex:1}}>
              {fieldLabel(isFinanz?"Anzahl Raten":"Anzahl (leer=7J)")}
              <input type="text" inputMode="numeric" value={count}
                onChange={e=>{setCount(e.target.value);if(e.target.value)setEndDate("");}}
                placeholder={`${calcCount()}`}
                style={{...inp(),marginBottom:0}}/>
            </div>
            <div style={{flex:1}}>
              {fieldLabel("Enddatum")}
              <input type="date" value={endDate}
                onChange={e=>{setEndDate(e.target.value);setCount("");}}
                style={{...inp({colorScheme:"dark"}),marginBottom:0}}/>
            </div>
          </div>
          <div style={{height:S.gap}}/>

          {/* Abweichende Erst-/Letztbuchung */}
          {isFinanz&&<>
          <div onClick={()=>{setCustomFL(v=>!v);setFirstAmount("");setLastAmount("");}}
            style={{display:"flex",alignItems:"center",gap:12,padding:`${S.pad}px ${S.padL}px`,
              borderRadius:S.radius,cursor:"pointer",marginBottom:S.gap,
              background:customFL?"rgba(74,159,212,0.12)":"rgba(255,255,255,0.04)",
              border:`2px solid ${customFL?T.blue:T.bd}`}}>
            <div style={{width:44,height:26,borderRadius:13,position:"relative",flexShrink:0,
              background:customFL?T.blue:"rgba(255,255,255,0.15)",transition:"background 0.2s"}}>
              <div style={{position:"absolute",top:3,left:customFL?21:3,width:20,height:20,
                borderRadius:"50%",background:"#fff",transition:"left 0.2s"}}/>
            </div>
            <span style={{color:customFL?T.txt:T.txt2,fontSize:S.fs}}>
              Abweichende Anzahlung / Schlussrate
            </span>
          </div>
          {customFL&&(
            <div style={{display:"flex",gap:S.gap,marginBottom:S.gap}}>
              <div style={{flex:1}}>
                {fieldLabel("Anzahlung (1. Rate)")}
                <input type="text" inputMode="decimal" value={firstAmount}
                  onChange={e=>setFirstAmount(e.target.value.replace(/[^0-9,\.]/g,""))}
                  placeholder={amount||"0,00"}
                  style={{...inp({border:`2px solid ${T.blue}66`})}}/>
              </div>
              <div style={{flex:1}}>
                {fieldLabel("Schlussrate")}
                <input type="text" inputMode="decimal" value={lastAmount}
                  onChange={e=>setLastAmount(e.target.value.replace(/[^0-9,\.]/g,""))}
                  placeholder={amount||"0,00"}
                  style={{...inp({border:`2px solid ${T.blue}66`})}}/>
              </div>
            </div>
          )}
          </>}

          {/* Vorschau */}
          <div style={{background:"rgba(0,0,0,0.2)",borderRadius:S.radius/2,
            padding:"10px 14px",marginBottom:S.gap,fontSize:S.fs-4,color:T.txt2,lineHeight:1.7}}>
            <span style={{color:T.pos,fontWeight:700}}>{totalCount}× {intervalLabel}</span>
            {amount&&<>{" · "}{isFinanz?"Rate":""} {fmt(amt())}</>}
            {gesamtbetrag&&<>{" · "}Gesamt: {gesamtbetrag}</>}
            {startDate&&<>{" · "}ab {startDate.split("-").reverse().join(".")}</>}
          </div>

          <button onClick={()=>{const a=amt();if(a>0) setStep(2);}}
            style={{...btnCenter,
              background:amount&&amt()>0?T.blue:"rgba(255,255,255,0.1)",
              color:amount&&amt()>0?"#fff":T.txt2}}>
            Weiter → Kategorie
          </button>
        </div>
      </>}

      {/* ── Schritt 2: Kategorie ── */}
      {step===2&&<>
        {header("Kategorie",fmt(amt()),2,()=>setStep(1))}
        <div style={{flex:1,padding:S.padL,overflowY:"auto",WebkitOverflowScrolling:"touch"}}>
          <MobileCatStep
            csvType={csvType}
            catId={catId} subId={subId}
            onSelect={(cId,sId)=>{setCatId(cId);setSubId(sId);setStep(3);}}
            S={S} btnBase={btnBase} btnCenter={btnCenter}
          />
          <button onClick={()=>{setCatId("");setSubId("");setStep(3);}}
            style={{...btnCenter,marginTop:S.gap*2,
              background:"rgba(255,255,255,0.04)",
              border:`1.5px dashed ${T.bd}`,color:T.txt2,fontWeight:400}}>
            Ohne Kategorie überspringen
          </button>
        </div>
      </>}


      {/* ── Schritt 3: Beschreibung, Datum ── */}
      {step===3&&<>
        {header("details","Beschreibung & Startdatum",3,()=>setStep(2))}
        <div style={{flex:1,padding:S.padL,overflowY:"auto",WebkitOverflowScrolling:"touch"}}>

          {/* Beschreibung — auto-grow, Placeholder */}
          <textarea value={desc} onChange={e=>setDesc(e.target.value)}
            placeholder={isFinanz?"Beschreibung (Pflichtfeld), z.B. Autokredit VW":"Beschreibung (Pflichtfeld), z.B. Miete"}
            rows={1}
            style={{width:"100%",boxSizing:"border-box",padding:`${S.padL}px`,
              borderRadius:S.radius,border:`2px solid ${desc?T.blue:T.neg}`,
              background:"rgba(255,255,255,0.06)",color:T.txt,
              fontSize:S.fs,fontFamily:"inherit",outline:"none",resize:"none",
              lineHeight:1.5,overflow:"hidden",marginBottom:S.gap,
              minHeight:S.fs*1.5+S.padL*2}}
            onInput={e=>{e.target.style.height="auto";e.target.style.height=e.target.scrollHeight+"px";}}
          />

          {/* Notiz — auto-grow, Placeholder */}
          <textarea value={note} onChange={e=>setNote(e.target.value)}
            placeholder="Notiz (optional), z.B. Vertragsnummer"
            rows={1}
            style={{width:"100%",boxSizing:"border-box",padding:`${S.padL}px`,
              borderRadius:S.radius,border:`2px solid ${note?T.blue:T.bd}`,
              background:"rgba(255,255,255,0.06)",color:T.txt,
              fontSize:S.fs,fontFamily:"inherit",outline:"none",resize:"none",
              lineHeight:1.5,overflow:"hidden",marginBottom:S.gap,
              minHeight:S.fs*1.5+S.padL*2}}
            onInput={e=>{e.target.style.height="auto";e.target.style.height=e.target.scrollHeight+"px";}}
          />

          {/* verursacht — Klick füllt heute */}
          <div style={{position:"relative",marginBottom:S.gap}}>
            {!valueDate&&<div onClick={()=>setValueDate(today)}
              style={{position:"absolute",inset:0,display:"flex",alignItems:"center",
                paddingLeft:S.padL,color:T.txt2,fontSize:S.fs-4,
                cursor:"pointer",borderRadius:S.radius,zIndex:1}}>
              {Li("calendar",S.fs-4,T.txt2)}
              <span style={{marginLeft:8}}>verursacht (optional) — tippe für heute</span>
            </div>}
            <input type="date" value={valueDate} onChange={e=>setValueDate(e.target.value)}
              style={{...inp({colorScheme:"dark",marginBottom:0,
                color:valueDate?T.txt:"transparent"})}}/>
            {valueDate&&<button onClick={()=>setValueDate("")}
              style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",
                background:"none",border:"none",color:T.txt2,cursor:"pointer",
                fontSize:S.fs,padding:4}}>✕</button>}
          </div>

          {/* Startdatum */}
          <div style={{position:"relative",marginBottom:S.gap}}>
            {!startDate&&<div style={{position:"absolute",left:S.padL,top:"50%",
              transform:"translateY(-50%)",color:T.txt2,fontSize:S.fs-4,
              pointerEvents:"none"}}>Startdatum</div>}
            <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)}
              style={{...inp({colorScheme:"dark",marginBottom:0,
                color:startDate?T.txt:"transparent"})}}/>
          </div>

          {/* Erste Buchung = Startdatum Toggle */}
          <div onClick={()=>setFirstIsStart(v=>!v)}
            style={{display:"flex",alignItems:"center",gap:12,padding:`${S.pad}px ${S.padL}px`,
              borderRadius:S.radius,cursor:"pointer",marginBottom:S.gap,
              background:firstIsStart?"rgba(74,159,212,0.12)":"rgba(255,255,255,0.04)",
              border:`2px solid ${firstIsStart?T.blue:T.bd}`}}>
            <div style={{width:44,height:26,borderRadius:13,position:"relative",flexShrink:0,
              background:firstIsStart?T.blue:"rgba(255,255,255,0.15)",transition:"background 0.2s"}}>
              <div style={{position:"absolute",top:3,left:firstIsStart?21:3,width:20,height:20,
                borderRadius:"50%",background:"#fff",transition:"left 0.2s"}}/>
            </div>
            <span style={{color:firstIsStart?T.txt:T.txt2,fontSize:S.fs}}>
              Erste Buchung = Startdatum
            </span>
          </div>

          {/* gilt für (Scope) */}
          {fieldLabel("gilt für")}
          <div style={{display:"flex",gap:S.gap/2,marginBottom:S.gap}}>
            {[["all","alle"],["from","ab dieser"],["single","nur diese"]].map(([v,l])=>(
              <button key={v} onClick={()=>setGiltFuer(v)}
                style={{flex:1,...btnCenter,padding:`${S.pad}px 4px`,
                  background:giltFuer===v?T.blue:"rgba(255,255,255,0.08)",
                  border:"none",color:giltFuer===v?"#fff":T.txt2,
                  fontSize:S.fs-6,fontWeight:700,borderRadius:S.radius/2}}>
                {l}
              </button>
            ))}
          </div>
          {giltFuer!=="all"&&(
            <input type="date" value={giltFuerDate} onChange={e=>setGiltFuerDate(e.target.value)}
              style={{...inp({colorScheme:"dark",marginBottom:S.gap})}}/>
          )}

          <button onClick={()=>{if(desc.trim()) setStep(4);}}
            disabled={!desc.trim()}
            style={{...btnCenter,background:desc.trim()?T.blue:"rgba(255,255,255,0.1)",
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
            ["Art",        csvType==="expense"?"Ausgabe":"Einnahme"],
            ["Konto",      (accounts||[]).find(a=>a.id===accId)?.name||accId],
            [isFinanz?"Rate":"Betrag", (csvType==="expense"?"−":"+")+fmt(amt())],
            ...(customFL&&firstAmount?[[isFinanz?"Anzahlung":"Erstbetrag",(csvType==="expense"?"−":"+")+fmt(pn(firstAmount.replace(",",".")))]]:[]),
            ...(customFL&&lastAmount?[[isFinanz?"Schlussrate":"Letztbetrag",(csvType==="expense"?"−":"+")+fmt(pn(lastAmount.replace(",",".")))]]:[]),
            ["Rhythmus",   intervalLabel],
            ["Anzahl",     `${totalCount}×`],
            ...(isFinanz?[["Gesamtbetrag", gesamtbetrag||"—"]]:[]),
            ["Startdatum", startDate.split("-").reverse().join(".")],
            ...(valueDate?[["verursacht", valueDate.split("-").reverse().join(".")]]:[]),
            ...(firstIsStart?[["erste Buchung","= Startdatum"]]:[]),
            ...(giltFuer!=="all"?[["gilt für", giltFuer==="from"?"ab "+giltFuerDate.split("-").reverse().join("."):"nur "+giltFuerDate.split("-").reverse().join(".")]]:[]),
            ["Kategorie",  catId?(getCat(catId)?.name||"?")+(subId?" / "+(getSub(catId,subId)?.name||""):""):"—"],
            ["Beschreibung",desc],
            ["Notiz",      note||"—"],
          ].map(([k,v])=>(
            <div key={k} style={{display:"flex",justifyContent:"space-between",
              padding:`${S.gap}px 0`,borderBottom:`1px solid ${T.bd}`,
              alignItems:"flex-start",gap:16}}>
              <span style={{color:T.txt2,fontSize:S.fs,flexShrink:0}}>{k}</span>
              <span style={{color:T.txt,fontSize:S.fs,fontWeight:600,
                textAlign:"right",flex:1,wordBreak:"break-word"}}>{v}</span>
            </div>
          ))}
          <button onClick={doSave}
            style={{...btnCenter,background:T.pos,color:"#fff",marginTop:S.gap*2}}>
            ✓ {totalCount}× {isFinanz?"Finanzierung":"wiederkehrend"} anlegen
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
// MobileBudgetModal — Budget setzen für iPhone
// ══════════════════════════════════════════════════════════════════════
// MobileKategorienModal — Kategorien & Budget kombiniert
// ── SubNameField: Inline-editierbarer Name einer Unterkategorie mit Focus-State ──
// Eigene Component damit der useState NICHT in einer map-Schleife steht (sonst Hook-Mismatch!)

export { MobileWiederkehrendModal };
